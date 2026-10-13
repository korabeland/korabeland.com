// Checks that every citation in the corpus opens a real route and lands on an
// element id that route actually emits. Pure: the caller supplies a function
// that returns the built page for a route, so tests use fixtures and
// scripts/check-built-site.ts uses the real build output.

import type { CorpusPassage } from "./types";

/** Problems for citations that do not resolve; empty means all resolve. */
export function findBrokenCitations(
  passages: readonly CorpusPassage[],
  readPage: (route: string) => string | null,
): string[] {
  const problems: string[] = [];
  const pages = new Map<string, string | null>();
  const checked = new Set<string>();
  for (const { route, anchor } of passages) {
    const key = `${route}#${anchor}`;
    if (checked.has(key)) continue;
    checked.add(key);
    if (!pages.has(route)) pages.set(route, readPage(route));
    const page = pages.get(route);
    if (page === null || page === undefined) {
      problems.push(`${route}: route is not in the build output`);
      continue;
    }
    if (
      anchor &&
      !new RegExp(`\\sid=["']${escapeRegExp(anchor)}["']`).test(page)
    ) {
      problems.push(`${route}: no element with id="${anchor}"`);
    }
  }
  return problems;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
