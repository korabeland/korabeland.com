import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Markdoc from "@markdoc/markdoc";
import { describe, expect, it } from "vitest";
import * as callTiering from "@/components/CallTieringStory/data";
import * as leadScoring from "@/components/LeadScoringStory/data";
import { buildStoryParts } from "@/components/LeadScoringStory/segments";
import { mapMetrics, readProject } from "@/lib/projects";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8");
const body = (slug: string) =>
  read(`src/content/projects/${slug}/index.mdoc`).replace(
    /^---\n[\s\S]*?\n---\n/,
    "",
  );

const callBody = body("call-tiering");
const leadBody = body("lead-scoring");

describe("the linked case studies use the approved figures", () => {
  it("pairs the real readiness answers with an illustrative tier layout", () => {
    expect(callTiering.MATRIX_COLS.question).toMatch(
      /reason for enquiring.*ready.*enroll/i,
    );
    expect(callTiering.MATRIX_COLS.options).toEqual([
      "Ready to enroll",
      "Gathering information",
      "Just browsing",
    ]);
    expect(callTiering.MATRIX_CELLS[0][0]).toBe(0);
    expect(callTiering.MATRIX_CELLS[3][2]).toBe(2);
    expect(callTiering.MATRIX_CELLS).toHaveLength(4);
    expect(callTiering.MATRIX_CELLS.every((row) => row.length === 3)).toBe(
      true,
    );
  });

  it("keeps the rounded call effort result and the conversion ratio", async () => {
    const project = await readProject("call-tiering");
    expect(project).not.toBeNull();
    if (!project) return;
    const values = mapMetrics("call-tiering", project.outcomeMetrics).map(
      (metric) => metric.value,
    );
    expect(values).toContain("about 30% → less than 1%");
    expect(values).toContain("8x");
    expect(callTiering.EFFORT_STATES[0].values.bottom).toBe("about 30%");
    expect(callTiering.EFFORT_STATES[1].values.bottom).toBe("less than 1%");
  });

  it("keeps the decile figure illustrative and the real dataset size", async () => {
    const project = await readProject("lead-scoring");
    expect(project).not.toBeNull();
    if (!project) return;
    const values = mapMetrics("lead-scoring", project.outcomeMetrics).map(
      (metric) => metric.value,
    );
    expect(values).toContain("about 600k leads");
    expect(leadScoring.DECILE_HEIGHTS).toHaveLength(10);
    expect(leadBody).toContain("illustrative");
    expect(leadBody).toContain("290 call attempts per application");
  });

  it("includes the approved call order and honest capacity limit", () => {
    for (const fact of [
      "up to four calls over 14 days",
      "two calls over 7 days",
      "one call on day 1",
      "Tier 1 leads applied at eight times Tier 3's rate",
      "8.2%",
      "No headcount was added",
      "Weekly call output later fell 16% while lead volume grew 8%",
    ]) {
      expect(callBody).toContain(fact);
    }
  });

  it("links both studies and preserves their distinct completion states", async () => {
    const call = await readProject("call-tiering");
    const lead = await readProject("lead-scoring");
    expect(call?.nextProject).toBe("lead-scoring");
    expect(call?.shippedAt).toBe("2025-11-13");
    expect(lead?.statusLabel).toBe("Designed and handed over, August 2026");
    expect(leadBody).toContain("[Call Tiering](/work/call-tiering)");
  });

  it("uses no dash punctuation in published copy", () => {
    for (const copy of [callBody, leadBody]) {
      expect(copy).not.toMatch(/[—–]|\s-\s/);
    }
  });

  it("removes superseded numbers and unsupported forecast language", () => {
    for (const copy of [callBody, leadBody]) {
      expect(copy).not.toMatch(/27\.8%|0\.7%|8\.1%|toward half/i);
    }
  });
});

describe("buildStoryParts: figure placements remain attached to the copy", () => {
  it("splits Call Tiering into two figure chapters and a close", () => {
    const parts = buildStoryParts(Markdoc.parse(callBody), [3, 2]);
    expect(parts.chapters).toHaveLength(2);
    expect(parts.intro.children.length).toBeGreaterThan(0);
    for (const chapter of parts.chapters) {
      expect(chapter.before.children.length).toBeGreaterThanOrEqual(2);
      expect(chapter.after.children.length).toBeGreaterThan(0);
    }
    expect(parts.closing.children[0].type).toBe("heading");
    expect(callTiering.CHAPTERS).toHaveLength(2);
  });

  it("splits Lead Scoring into one figure chapter and a close", () => {
    const parts = buildStoryParts(Markdoc.parse(leadBody), [3]);
    expect(parts.chapters).toHaveLength(1);
    expect(parts.chapters[0].before.children).toHaveLength(3);
    expect(parts.chapters[0].after.children.length).toBeGreaterThan(0);
    expect(parts.closing.children[0].type).toBe("heading");
  });

  it("fails when an expected section or figure setup is missing", () => {
    const oneHeading = "Intro.\n\n## Only section\n\nOne.\n\nTwo.\n\nThree.\n";
    expect(() => buildStoryParts(Markdoc.parse(oneHeading), [3, 3])).toThrow(
      /expected 3 h2 sections/,
    );
    const noFigureBody =
      "Intro.\n\n## A\n\nOnly paragraph.\n\n## Closing\n\nEnd.\n";
    expect(() => buildStoryParts(Markdoc.parse(noFigureBody), [3])).toThrow(
      /prose on both sides/,
    );
  });
});
