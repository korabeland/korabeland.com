#!/usr/bin/env tsx
// Generates src/content/ask-index/corpus.json, the grounding corpus for Ask
// the Operator (U1). Unlike gen-trail-register and gen-shift-log, there is
// no seed fallback here: this is the retriever's only source of truth, so a
// bad read, an unbalanced about.astro extraction marker, or an empty corpus
// must fail the build loudly rather than ship a stale or partial index.
//
// Sources, deliberately not a full list of "everything on the site":
//   - published projects  src/content/projects/*/index.mdoc
//   - published posts     src/content/posts/*/index.mdoc
//   - the about-page career narrative and "how I operate" prose, extracted
//     from src/pages/about.astro between the ABOUT-PROSE:START/END markers
//   - the STATUS constants (src/lib/status.ts), as structured fact chunks
// public/llms.txt, JSON-LD, src/content/for/ (tailored pages), draft posts
// and projects, and src/pages/dev/ routes are excluded on purpose: none of
// them is read anywhere in this file.
//
// Frontmatter note: neither collection's Keystatic schema (keystatic.config.ts)
// has a `status` field. Posts gate on `publishedAt` being present (the same
// rule src/lib/posts.ts and tests/lib/collection-routes.ts already apply);
// projects have no draft/publish gate at all today (see
// tests/coverage-sync.test.ts: "projects have no draft gate"). isPostPublished
// and isProjectPublished below honour an explicit `status: draft` too, so
// this stays correct if that field is ever added, without anyone having to
// touch this generator.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  type AnchoredSection,
  buildDocumentChunks,
  chunksFromAnchoredSections,
  computeCorpusRevision,
  splitHtmlIntoSections,
} from "../src/lib/ask/corpus";
import {
  CORPUS_SCHEMA_VERSION,
  type CorpusChunk,
  type CorpusIndexArtifact,
} from "../src/lib/ask/types";
import { projectHref } from "../src/lib/projects";
import { STATUS } from "../src/lib/status";

// Captured once and reused below (including in the isMainModule check at
// the bottom): a repeated inline `import.meta.url` reference trips a Vite
// SSR-transform quirk that throws "The URL must be of scheme file" the
// moment this module is imported by Vitest rather than run directly by
// tsx. Assigning it to a variable first sidesteps that quirk in both
// runners.
const moduleUrl = import.meta.url;
const __dirname = fileURLToPath(new URL(".", moduleUrl));
const repoRoot = resolve(__dirname, "..");
const PROJECTS_DIR = resolve(repoRoot, "src/content/projects");
const POSTS_DIR = resolve(repoRoot, "src/content/posts");
const ABOUT_ASTRO_PATH = resolve(repoRoot, "src/pages/about.astro");
const OUT_DIR = resolve(repoRoot, "src/content/ask-index");
const OUT_FILE = resolve(OUT_DIR, "corpus.json");

/** Route the STATUS fact chunks cite. STATUS.aboutLine renders the fullest
 *  human-readable version of these facts (relocation + citizenship, see
 *  src/pages/about.astro); the homepage hero only shows the short
 *  "melbourne → washington dc" readout. */
const STATUS_ROUTE = "/about";

export interface RawContentDoc {
  slug: string;
  /** Full file content, frontmatter block included. */
  raw: string;
}

/**
 * Minimal YAML-frontmatter scalar reader, the same two conventions
 * tests/lib/collection-routes.ts already relies on (plain/quoted
 * single-line values, and `>-` folded block scalars), plus a fix for the
 * known gap in that parser: a single-quoted scalar escapes a literal
 * apostrophe as a doubled quote ('wasn''t' -> wasn't), and the existing
 * parser strips only the outer quotes, leaving the doubled quote behind
 * (see the repo's reference_frontmatter_apostrophe_sync_parser note).
 * Not a general YAML parser, just enough for this repo's two content
 * collections.
 */
export function parseFrontmatterBlock(block: string): Record<string, string> {
  const lines = block.split("\n");
  const result: Record<string, string> = {};
  let i = 0;
  while (i < lines.length) {
    const keyMatch = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const [, key, rest] = keyMatch;
    if (/^[>|][-+]?$/.test(rest)) {
      const collected: string[] = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        collected.push(lines[i].trim());
        i++;
      }
      result[key] = collected.join(" ");
      continue;
    }
    result[key] = unquoteYamlScalar(rest.trim());
    i++;
  }
  return result;
}

function unquoteYamlScalar(value: string): string {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

export interface ParsedMdocDoc {
  fm: Record<string, string>;
  body: string;
}

const FRONTMATTER_BLOCK = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/**
 * Splits a raw .mdoc file into its frontmatter fields and body markdown. A
 * file with no `---`-delimited frontmatter block is a parse error, not
 * silently treated as bodyless content, this generator has no seed
 * fallback, so a malformed content file must fail the build rather than
 * quietly drop text from the corpus.
 */
export function parseMdocFile(raw: string, sourceLabel: string): ParsedMdocDoc {
  const match = raw.match(FRONTMATTER_BLOCK);
  if (!match) {
    throw new Error(
      `gen-corpus-index: ${sourceLabel} has no '---' delimited frontmatter block`,
    );
  }
  return { fm: parseFrontmatterBlock(match[1]), body: match[2] };
}

/**
 * Draft gate for posts: no `status` field exists in the schema, only
 * `publishedAt` (src/lib/posts.ts: selectPublished). A post with no
 * publishedAt is a draft. `status: draft` is also honoured as an override.
 */
export function isPostPublished(fm: Record<string, string>): boolean {
  if (fm.status === "draft") return false;
  return Boolean(fm.publishedAt && fm.publishedAt.trim().length > 0);
}

/**
 * Projects carry no draft/publish gate in the schema at all today, every
 * directory on disk routes (tests/coverage-sync.test.ts: "projects have no
 * draft gate"). The only exclusion honoured here is an explicit
 * `status: draft` override, for forward compatibility if that field is ever
 * added, not because any real project currently sets it.
 */
export function isProjectPublished(fm: Record<string, string>): boolean {
  return fm.status !== "draft";
}

const ABOUT_MARKER_START = "<!-- ABOUT-PROSE:START";
const ABOUT_MARKER_END = "<!-- ABOUT-PROSE:END -->";

/**
 * Pulls the HTML between the ABOUT-PROSE:START/END markers out of
 * about.astro's raw source. A missing or unbalanced marker is a build
 * error naming the marker at fault, rather than a silent empty extraction,
 * so a future edit to about.astro that drops a marker fails loudly instead
 * of quietly shrinking the corpus.
 */
export function extractAboutProse(source: string): string {
  const startIndex = source.indexOf(ABOUT_MARKER_START);
  if (startIndex === -1) {
    throw new Error(
      `gen-corpus-index: missing ${ABOUT_MARKER_START} marker in about.astro`,
    );
  }
  const startCommentEnd = source.indexOf("-->", startIndex);
  if (startCommentEnd === -1) {
    throw new Error(
      "gen-corpus-index: ABOUT-PROSE:START marker comment is never closed ('-->' not found) in about.astro",
    );
  }
  const contentStart = startCommentEnd + "-->".length;
  const endIndex = source.indexOf(ABOUT_MARKER_END, contentStart);
  if (endIndex === -1) {
    throw new Error(
      `gen-corpus-index: missing ${ABOUT_MARKER_END} marker in about.astro`,
    );
  }
  return source.slice(contentStart, endIndex);
}

interface StatusFacts {
  base: string;
  target: string;
  citizenship: string;
  authorization: string;
  nationalities: readonly string[];
}

/**
 * Two coherent fact-group chunks rather than one, so a narrow question
 * ("where is Korab based") does not have to pull in the unrelated
 * authorization sentence. Values are read straight off STATUS
 * (src/lib/status.ts), the single source of truth, never paraphrased, so
 * nothing here can drift from what the site itself states.
 */
export function buildStatusSections(status: StatusFacts): AnchoredSection[] {
  return [
    {
      heading: "Location and relocation",
      anchor: "location",
      body: `Based in ${status.base}. Relocating to ${status.target}.`,
    },
    {
      heading: "Citizenship and work authorization",
      anchor: "citizenship",
      body: `Citizenship: ${status.citizenship}. Work authorization: ${status.authorization}. Nationalities: ${status.nationalities.join(" and ")}.`,
    },
  ];
}

export interface AssembleCorpusInput {
  projectDocs: RawContentDoc[];
  postDocs: RawContentDoc[];
  aboutAstroSource: string;
  statusFacts: StatusFacts;
}

/**
 * The full source-to-chunks pipeline, taking every input as already-read
 * strings/objects so it is fixture-testable without touching the
 * filesystem. main() is the only thing in this file that actually reads
 * from disk; it builds an AssembleCorpusInput and hands it here.
 */
export function assembleCorpus(input: AssembleCorpusInput): CorpusChunk[] {
  const chunks: CorpusChunk[] = [];

  for (const doc of input.projectDocs) {
    const { fm, body } = parseMdocFile(doc.raw, `project "${doc.slug}"`);
    if (!isProjectPublished(fm)) continue;
    const category = fm.category === "side" ? "side" : "work";
    chunks.push(
      ...buildDocumentChunks({
        route: projectHref({ slug: doc.slug, category }),
        sourceKind: "project",
        docId: `project:${doc.slug}`,
        markdown: body,
        fallbackTitle: fm.title ?? doc.slug,
      }),
    );
  }

  for (const doc of input.postDocs) {
    const { fm, body } = parseMdocFile(doc.raw, `post "${doc.slug}"`);
    if (!isPostPublished(fm)) continue;
    chunks.push(
      ...buildDocumentChunks({
        route: `/notes/${doc.slug}`,
        sourceKind: "post",
        docId: `post:${doc.slug}`,
        markdown: body,
        fallbackTitle: fm.title ?? doc.slug,
      }),
    );
  }

  const aboutHtml = extractAboutProse(input.aboutAstroSource);
  const aboutSections: AnchoredSection[] = splitHtmlIntoSections(aboutHtml).map(
    (section) => ({
      heading: section.heading,
      anchor: section.heading === null ? "about" : section.anchor,
      body: section.body,
    }),
  );
  chunks.push(
    ...chunksFromAnchoredSections(aboutSections, {
      route: "/about",
      sourceKind: "about",
      docId: "about",
      fallbackTitle: "About",
    }),
  );

  chunks.push(
    ...chunksFromAnchoredSections(buildStatusSections(input.statusFacts), {
      route: STATUS_ROUTE,
      sourceKind: "status",
      docId: "status",
      fallbackTitle: "Status",
    }),
  );

  return sortCorpusChunks(chunks);
}

/** Stable output order: (route, anchor, id). Determinism depends on this
 *  running before computeCorpusRevision and before the file is written. */
export function sortCorpusChunks(chunks: CorpusChunk[]): CorpusChunk[] {
  return [...chunks].sort((a, b) => {
    return (
      a.route.localeCompare(b.route) ||
      a.anchor.localeCompare(b.anchor) ||
      a.id.localeCompare(b.id)
    );
  });
}

function listContentDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readContentDocs(dir: string): RawContentDoc[] {
  return listContentDirs(dir).map((slug) => ({
    slug,
    raw: readFileSync(resolve(dir, slug, "index.mdoc"), "utf8"),
  }));
}

async function main(): Promise<void> {
  const chunks = assembleCorpus({
    projectDocs: readContentDocs(PROJECTS_DIR),
    postDocs: readContentDocs(POSTS_DIR),
    aboutAstroSource: readFileSync(ABOUT_ASTRO_PATH, "utf8"),
    statusFacts: STATUS,
  });

  if (chunks.length === 0) {
    throw new Error(
      "gen-corpus-index: assembled corpus is empty, refusing to write an empty index",
    );
  }

  const artifact: CorpusIndexArtifact = {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    corpusRevision: computeCorpusRevision(chunks),
    chunks,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(
    `gen-corpus-index: wrote ${chunks.length} chunks -> ${OUT_FILE} (revision ${artifact.corpusRevision.slice(0, 12)})`,
  );
}

// Only run the real, disk-touching pipeline when this file is executed
// directly (`tsx scripts/gen-corpus-index.ts`), not when it is imported for
// its testable pieces (parseFrontmatterBlock, assembleCorpus, and so on).
// This mirrors the guard scripts/rig-manifest-hash.ts avoids needing by
// staying side-effect-free; this file cannot stay side-effect-free and
// still export main()'s building blocks, so it needs the guard instead.
const isMainModule =
  process.argv[1] != null && moduleUrl === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
