import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Markdoc from "@markdoc/markdoc";
import { describe, expect, it } from "vitest";
import * as data from "@/components/LeadScoringStory/data";
import { buildStoryParts } from "@/components/LeadScoringStory/segments";

// The flagship case study's contract: every figure it prints is already
// published on one of the three source case studies, and its copy follows the
// fixed writing rule (no em dash). A new number, or a dash, fails here rather
// than at review.

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const SOURCES = ["intent-tiers", "call-tier-discipline", "lead-scoring"].map(
  (slug) => read(`src/content/projects/${slug}/index.mdoc`),
);
const STORY = read(`src/content/projects/${data.STORY_SLUG}/index.mdoc`);
const STORY_BODY = STORY.replace(/^---\n[\s\S]*?\n---\n/, "");

// Strings the assembling component prints around the figures: every
// double-quoted literal in its template (after the frontmatter fence).
const TEMPLATE = read("src/components/LeadScoringStory/index.astro")
  .split(/^---$/m)
  .slice(2)
  .join("");
const TEMPLATE_STRINGS = [...TEMPLATE.matchAll(/"([^"\n]*)"/g)].map(
  (m) => m[1],
);

/** Every string reachable from a value, depth first. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(strings);
  }
  return [];
}

const steps = data.DECILE_HEIGHTS.length;
const DATA_STRINGS = [
  ...strings({
    chapters: data.CHAPTERS,
    rows: data.MATRIX_ROWS,
    cols: data.MATRIX_COLS,
    buckets: data.MATRIX_BUCKETS,
    segments: data.EFFORT_SEGMENTS,
    states: data.EFFORT_STATES,
    ratio: data.RATE_RATIO,
    notes: data.DECILE_NOTES,
  }),
  ...Array.from({ length: steps + 1 }, (_, cut) =>
    data.decileReadout(cut, steps),
  ),
];

const PUBLISHED = [STORY, ...TEMPLATE_STRINGS, ...DATA_STRINGS];

/** Numeric tokens with their unit, e.g. "27.8%", "600k", "8×", "16%". */
function figures(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,]\d+)?\s?(?:%|×|k\b)?/g)].map((m) =>
    m[0].replace(/\s/g, ""),
  );
}

// A bare whole number from 0 to 10 is a count of things on the page (chapter
// 1, tier 3, figure 02, bottom 5 deciles of 10), not a measurement.
const isCount = (token: string) => /^0?\d$|^10$/.test(token);

// "1×" is the unit bar the published 8× is drawn against, not a new figure.
const DERIVED = new Set(["1×"]);

describe("flagship case study: every figure traces to a source page", () => {
  const sourceFigures = new Set(SOURCES.flatMap(figures));

  it("finds the source pages' own figures (the check is live)", () => {
    for (const known of ["8.1%", "16%", "27.8%", "0.7%", "600k", "27%"]) {
      expect(sourceFigures, known).toContain(known);
    }
  });

  it("prints no number the three source pages do not publish", () => {
    const untraced = PUBLISHED.flatMap(figures).filter(
      (token) =>
        !isCount(token) && !DERIVED.has(token) && !sourceFigures.has(token),
    );
    expect(untraced).toEqual([]);
  });

  it("carries each chapter's headline figure in the body", () => {
    for (const figure of ["8.1%", "16%", "27.8%", "0.7%", "600k", "27%"]) {
      expect(figures(STORY_BODY), figure).toContain(figure);
    }
  });

  it("reuses the source pages' metric provenance word for word", () => {
    const provenance = [...STORY.matchAll(/provenance: >-\n((?: {6}.*\n)+)/g)]
      .map((m) => m[1].replace(/\s+/g, " ").trim())
      .filter(Boolean);
    expect(provenance).toHaveLength(4);
    const flatSources = SOURCES.map((s) => s.replace(/\s+/g, " "));
    for (const text of provenance) {
      expect(
        flatSources.some((source) => source.includes(text)),
        text,
      ).toBe(true);
    }
  });
});

describe("flagship case study: writing rules", () => {
  it("uses no em dash, en dash, or spaced hyphen as a dash", () => {
    for (const text of PUBLISHED) {
      expect(text, text.slice(0, 60)).not.toMatch(/[—–]|\S - \S/);
    }
  });
});

describe("buildStoryParts: one figure per chapter", () => {
  const parse = (body: string) => Markdoc.parse(body);

  it("splits the published body into three chapters and a closing section", () => {
    const parts = buildStoryParts(parse(STORY_BODY), data.FIGURE_AFTER);
    expect(parts.chapters.map((c) => c.title)).toEqual([
      "Chapter 1: who to call first",
      "Chapter 2: who to stop calling",
      "Chapter 3: a score for every lead",
    ]);
    // Prose on both sides of every figure, and an intro before chapter 1.
    expect(parts.intro.children.length).toBeGreaterThan(0);
    for (const chapter of parts.chapters) {
      expect(chapter.before.children).toHaveLength(3);
      expect(chapter.after.children.length).toBeGreaterThan(0);
    }
    expect(parts.closing.children[0].type).toBe("heading");
  });

  it("has one rail entry per chapter", () => {
    expect(data.CHAPTERS).toHaveLength(data.FIGURE_AFTER.length);
  });

  it("fails the build when a chapter heading goes missing", () => {
    const body = "Intro.\n\n## Only chapter\n\nOne.\n\nTwo.\n\nThree.\n";
    expect(() => buildStoryParts(parse(body), [3, 3, 3])).toThrow(
      /expected 4 h2 sections/,
    );
  });

  it("fails the build when a chapter has no prose after its figure", () => {
    const body = "Intro.\n\n## A\n\nOne.\n\nTwo.\n\n## Closing\n\nEnd.\n";
    expect(() => buildStoryParts(parse(body), [3])).toThrow(
      /prose on both sides/,
    );
  });
});
