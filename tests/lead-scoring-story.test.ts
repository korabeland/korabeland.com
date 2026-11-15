import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Markdoc from "@markdoc/markdoc";
import { describe, expect, it } from "vitest";
import * as data from "@/components/LeadScoringStory/data";
import { buildStoryParts } from "@/components/LeadScoringStory/segments";
import { mapMetrics, readProject } from "@/lib/projects";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");

const STORY = read(`src/content/projects/${data.STORY_SLUG}/index.mdoc`);
const STORY_BODY = STORY.replace(/^---\n[\s\S]*?\n---\n/, "");

describe("flagship case study: source provenance", () => {
  it("pairs the real readiness answers with an illustrative tier layout", () => {
    expect(data.MATRIX_COLS.question).toMatch(
      /reason for enquiring.*ready.*enroll/i,
    );
    expect(data.MATRIX_COLS.options).toEqual([
      "Ready to enroll",
      "Gathering information",
      "Just browsing",
    ]);
    expect(data.MATRIX_CELLS[0][0]).toBe(0);
    expect(data.MATRIX_CELLS[3][2]).toBe(2);
  });

  it("keeps each metric with its source record", async () => {
    const slugs = [
      "intent-tiers",
      "call-tier-discipline",
      "lead-scoring",
      data.STORY_SLUG,
    ];
    const projects = await Promise.all(slugs.map((slug) => readProject(slug)));
    const records = new Map<string, ReturnType<typeof mapMetrics>>();
    for (const [i, project] of projects.entries()) {
      expect(project, slugs[i]).not.toBeNull();
      if (!project) throw new Error(`Project ${slugs[i]} is missing.`);
      records.set(slugs[i], mapMetrics(slugs[i], project.outcomeMetrics));
    }
    const storyMetrics = records.get(data.STORY_SLUG)!;
    const sourcedMetrics = [
      ["2 → 3", "intent-tiers"],
      ["8×", "call-tier-discipline"],
      ["27.8% → 0.7%", "call-tier-discipline"],
      ["~600k leads", "lead-scoring"],
    ] as const;

    for (const [value, sourceSlug] of sourcedMetrics) {
      const storyMetric = storyMetrics.find((metric) => metric.value === value);
      const sourceMetric = records
        .get(sourceSlug)!
        .find((metric) => metric.value === value);
      expect(storyMetric, value).toBeDefined();
      expect(sourceMetric, `${sourceSlug}: ${value}`).toBeDefined();
      expect(storyMetric).toEqual(sourceMetric);
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
