#!/usr/bin/env tsx
// Generates src/content/ask-index/corpus.json, the grounding corpus for Ask
// the Operator. Unlike gen-trail-register and gen-shift-log there is no seed
// fallback: this is the only source of truth for answers, so an unreadable
// source, an unsupported content node, an oversized or unresolved passage or an
// unknown citation fails the build instead of shipping a stale or partial
// index. The file is written only after every check passes.
//
// What goes in, all read through the site's own readers: published notes, all
// projects (role, team, span, results with their basis, field log, reflection),
// the experience records, skills/education/certifications, the About prose, the
// location and citizenship facts. Tailored pages, drafts, dev and admin routes,
// machine-facing files such as public/llms.txt, and the generated activity
// feeds are never read.

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSiteCorpus } from "../src/lib/ask/site";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = resolve(root, "src/content/ask-index/corpus.json");

async function main(): Promise<void> {
  const artifact = await buildSiteCorpus();
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  const tmp = `${OUT_FILE}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  renameSync(tmp, OUT_FILE);
  console.log(
    `gen-corpus-index: ${artifact.passages.length} passages, revision ${artifact.corpusRevision.slice(0, 12)} -> ${OUT_FILE}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
