import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listPosts } from "../src/lib/posts";
import { listProjects } from "../src/lib/projects";
import {
  postRoutes,
  postRoutesSync,
  projectRoutes,
  projectRoutesSync,
} from "./lib/collection-routes";

// Guard: a published project or post must always show up in the enumerated
// route lists tests/e2e and tests/visual draw coverage from. Cross-checking
// the reader's output against an independent fs-glob of the content dirs
// catches two failure modes a route-count assertion alone would miss: the
// reader silently dropping an entry, and a published-filter drift (an entry
// the reader treats as published/unpublished differently than the fs data
// says it should be).

const PROJECTS_DIR = resolve(process.cwd(), "src/content/projects");
const POSTS_DIR = resolve(process.cwd(), "src/content/posts");

interface CoverageResult {
  missingFromReader: string[];
  extraInReader: string[];
  matches: boolean;
}

/**
 * Pure comparison: `fsSlugs` filtered by `publishedFilter` is the "expected
 * published" set; `readerSlugs` is what the reader actually returned. Any
 * drift between them fails the comparison. Pure so it's fixture-testable
 * without touching the filesystem or a live reader.
 */
function compareCoverage(
  readerSlugs: string[],
  fsSlugs: string[],
  publishedFilter: (slug: string) => boolean,
): CoverageResult {
  const expected = new Set(fsSlugs.filter(publishedFilter));
  const actual = new Set(readerSlugs);
  const missingFromReader = [...expected]
    .filter((slug) => !actual.has(slug))
    .sort();
  const extraInReader = [...actual]
    .filter((slug) => !expected.has(slug))
    .sort();
  return {
    missingFromReader,
    extraInReader,
    matches: missingFromReader.length === 0 && extraInReader.length === 0,
  };
}

describe("compareCoverage — pure function", () => {
  // Test-first: this is the exact drift the guard exists to catch — a slug
  // present on disk (and expected to be published) but absent from the
  // reader's output. Written before the happy-path cases below.
  it("fails when a fs slug is published but missing from the reader", () => {
    const result = compareCoverage(
      ["known"],
      ["known", "dropped-by-reader"],
      () => true,
    );
    expect(result.matches).toBe(false);
    expect(result.missingFromReader).toEqual(["dropped-by-reader"]);
    expect(result.extraInReader).toEqual([]);
  });

  it("fails when the reader returns a slug with no fs backing", () => {
    const result = compareCoverage(["known", "phantom"], ["known"], () => true);
    expect(result.matches).toBe(false);
    expect(result.extraInReader).toEqual(["phantom"]);
  });

  it("ignores fs slugs the publishedFilter excludes", () => {
    const result = compareCoverage(
      ["live"],
      ["live", "draft"],
      (slug) => slug !== "draft",
    );
    expect(result.matches).toBe(true);
  });

  it("passes when the reader and the filtered fs slugs match exactly", () => {
    const result = compareCoverage(["a", "b"], ["b", "a"], () => true);
    expect(result).toEqual({
      missingFromReader: [],
      extraInReader: [],
      matches: true,
    });
  });
});

function fsSlugs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Reads `publishedAt` straight off the entry's index.mdoc, independent of
 * both the Keystatic reader and `selectPublished` — so this guard still
 * catches a bug in either of those rather than trusting the same code path
 * it exists to check.
 */
function isPublishedOnDisk(postSlug: string): boolean {
  const raw = readFileSync(resolve(POSTS_DIR, postSlug, "index.mdoc"), "utf8");
  const match = raw.match(/^publishedAt:\s*(.*)$/m);
  if (!match) return false;
  const value = match[1].trim().replace(/^['"]|['"]$/g, "");
  return value.length > 0;
}

describe("collection coverage floor", () => {
  // Non-empty rather than exact counts — the floor guards against a
  // silent drop to zero, not against the count changing as content ships.
  it("has at least 7 published project routes", async () => {
    const routes = await projectRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(7);
  });

  it("has at least 2 published post routes", async () => {
    const routes = await postRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("collection coverage sync — reader vs fs", () => {
  it("project routes match every entry on disk (projects have no draft gate)", async () => {
    const readerSlugs = (await projectRoutes()).map((route) =>
      route.replace("/work/", ""),
    );
    const result = compareCoverage(
      readerSlugs,
      fsSlugs(PROJECTS_DIR),
      () => true,
    );
    expect(result.matches, JSON.stringify(result)).toBe(true);
  });

  it("post routes match every published entry on disk", async () => {
    const readerSlugs = (await postRoutes()).map((route) =>
      route.replace("/notes/", ""),
    );
    const result = compareCoverage(
      readerSlugs,
      fsSlugs(POSTS_DIR),
      isPublishedOnDisk,
    );
    expect(result.matches, JSON.stringify(result)).toBe(true);
  });
});

// Playwright transforms spec files to CJS, where a top-level `await` throws
// at collect time — so the four Playwright specs enumerate routes with the
// synchronous `projectRoutesSync`/`postRoutesSync` (hand-rolled frontmatter
// parsing) instead of the async reader-based `projectRoutes`/`postRoutes`.
// This is the guard that keeps that hand-rolled parser honest: if it ever
// drifts from what the Keystatic reader actually returns — a route, a
// title, or a description — this fails before a Playwright spec silently
// tests the wrong copy.
describe("sync fs enumeration matches the async reader enumeration", () => {
  it("project sync entries match the reader on slug, path, title, and description", async () => {
    const syncEntries = projectRoutesSync();
    const readerBySlug = new Map(
      (await listProjects()).map((p) => [p.slug, p]),
    );

    expect(syncEntries.map((e) => e.slug).sort()).toEqual(
      [...readerBySlug.keys()].sort(),
    );
    for (const entry of syncEntries) {
      const reader = readerBySlug.get(entry.slug);
      expect(reader, entry.slug).toBeTruthy();
      expect(entry.path).toBe(`/work/${entry.slug}`);
      expect(entry.title).toBe(reader?.title);
      expect(entry.description).toBe(reader?.description);
    }
  });

  it("post sync entries match the reader on slug, path, title, and description", async () => {
    const syncEntries = postRoutesSync();
    const readerBySlug = new Map((await listPosts()).map((p) => [p.slug, p]));

    expect(syncEntries.map((e) => e.slug).sort()).toEqual(
      [...readerBySlug.keys()].sort(),
    );
    for (const entry of syncEntries) {
      const reader = readerBySlug.get(entry.slug);
      expect(reader, entry.slug).toBeTruthy();
      expect(entry.path).toBe(`/notes/${entry.slug}`);
      expect(entry.title).toBe(reader?.title);
      expect(entry.description).toBe(reader?.description);
    }
  });
});
