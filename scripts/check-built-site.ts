#!/usr/bin/env tsx
// Post-build checks on the prerendered output in dist/client. Runs after
// `pnpm build` as part of `pnpm smoke:production`.
//
//   1. Every Ask the Operator citation opens a route that was built and lands
//      on an element id that page really contains.
//   2. The search panel's /ask-index.json is built and is byte-for-byte the
//      corpus the citations were checked against.
//   3. Analytics loading and pageview requests are exercised by the browser
//      proof in tests/e2e/analytics.spec.ts.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findBrokenCitations } from "../src/lib/ask/citations";
import type { CorpusArtifact } from "../src/lib/ask/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = resolve(root, "dist/client");
const corpusFile = resolve(root, "src/content/ask-index/corpus.json");

const failures: string[] = [];
function fail(message: string): void {
  failures.push(message);
}

function readRoute(route: string): string | null {
  const candidates =
    route === "/"
      ? [join(clientDir, "index.html")]
      : [join(clientDir, route, "index.html"), join(clientDir, route)];
  for (const file of candidates) {
    try {
      return readFileSync(file, "utf8");
    } catch {
      // Missing file, or a directory for the bare route: try the next one.
    }
  }
  return null;
}

if (!existsSync(clientDir)) {
  console.error(
    "check-built-site: dist/client not found. Run `pnpm build` first.",
  );
  process.exit(1);
}

// 1. Citations.
const artifact = JSON.parse(readFileSync(corpusFile, "utf8")) as CorpusArtifact;
for (const problem of findBrokenCitations(artifact.passages, readRoute)) {
  fail(`citation: ${problem}`);
}

// 2. The file the browser searches.
const served = readRoute("/ask-index.json");
if (served === null) {
  fail("ask-index.json: not in the build output");
} else if (JSON.stringify(JSON.parse(served)) !== JSON.stringify(artifact)) {
  fail("ask-index.json: differs from src/content/ask-index/corpus.json");
}

if (failures.length > 0) {
  console.error(
    `check-built-site: ${failures.length} problem(s)\n  ${failures.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `check-built-site: ${artifact.passages.length} passages cite real routes and anchors`,
);
