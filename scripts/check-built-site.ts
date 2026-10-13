#!/usr/bin/env tsx
// Post-build checks on the prerendered output in dist/client. Runs after
// `pnpm build` as part of `pnpm smoke:production`.
//
//   1. Every Ask the Operator citation opens a route that was built and lands
//      on an element id that page really contains.
//   2. Every built page loads Vercel Web Analytics exactly once: the page
//      shell's client is present, and the Vercel adapter's own collector is
//      not (two would count each pageview twice).

import { existsSync, readdirSync, readFileSync } from "node:fs";
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

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
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

// 2. Analytics, once per page.
const COLLECTOR = "/_vercel/insights/script.js";
const pages = htmlFiles(clientDir);
let counted = 0;
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  // Redirect stubs emitted for the site's permanent redirects have no shell.
  if (/http-equiv=["']refresh["']/i.test(html)) continue;
  const clients = html.split(COLLECTOR).length - 1;
  if (clients !== 1) {
    fail(
      `analytics: ${file.replace(`${clientDir}/`, "")} references the collector ${clients} times, expected 1`,
    );
  }
  counted += 1;
}

if (failures.length > 0) {
  console.error(
    `check-built-site: ${failures.length} problem(s)\n  ${failures.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `check-built-site: ${artifact.passages.length} passages cite real routes and anchors; analytics client present once on ${counted} pages`,
);
