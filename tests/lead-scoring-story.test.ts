import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Markdoc from "@markdoc/markdoc";
import { describe, expect, it } from "vitest";
import * as data from "@/components/LeadScoringStory/data";
import { buildStoryParts } from "@/components/LeadScoringStory/segments";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const SOURCES = ["intent-tiers", "call-tier-discipline", "lead-scoring"].map(
  (slug) => read(`src/content/projects/${slug}/index.mdoc`),
);
const STORY = read(`src/content/projects/${data.STORY_SLUG}/index.mdoc`);
const STORY_BODY = STORY.replace(/^---\n[\s\S]*?\n---\n/, "");

describe("flagship case study: source provenance", () => {
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

describe("buildStoryParts: one figure per chapter", () => {
  const parse = (body: string) => Markdoc.parse(body);

  it("splits the published body into three chapters and a closing section", () => {
    const parts = buildStoryParts(parse(STORY_BODY), data.FIGURE_AFTER);
    expect(parts.chapters.map((c) => c.title)).toEqual([
      "Chapter 1: who to call first",
      "Chapter 2: who to stop calling",
      "Chapter 3: a score for every lead",
    ]);
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
