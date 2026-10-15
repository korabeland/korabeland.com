// Pure text handling for the Ask the Operator corpus: normalising, splitting
// to a size limit without losing text, hashing and validating. No file, DOM or
// network access, so the whole module runs under Vitest with plain fixtures.
// The one node: import is node:crypto, a pure hash over data already in hand.

import { createHash } from "node:crypto";
import type { CorpusDocument, CorpusPassage } from "./types";

/** Every passage is held to this many characters, no exceptions. */
export const MAX_PASSAGE_CHARS = 1200;

/** Collapse every whitespace run (including non-breaking spaces) to one space. */
export function normalizeInline(text: string): string {
  return text.replace(/[\s ]+/g, " ").trim();
}

function splitAtWords(text: string, maxChars: number): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    // A single token longer than the limit is cut hard; nothing is dropped.
    let rest = word;
    while (rest.length > maxChars) {
      if (current) {
        pieces.push(current);
        current = "";
      }
      pieces.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    if (!rest) continue;
    const joined = current ? `${current} ${rest}` : rest;
    if (joined.length > maxChars) {
      pieces.push(current);
      current = rest;
    } else {
      current = joined;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Splits one paragraph into pieces of at most maxChars. Prefers sentence
 * boundaries, falls back to word boundaries for a sentence that is itself too
 * long. Joining the pieces with single spaces gives back the paragraph.
 */
export function splitParagraph(
  paragraph: string,
  maxChars: number = MAX_PASSAGE_CHARS,
): string[] {
  const text = normalizeInline(paragraph);
  if (text.length <= maxChars) return text ? [text] : [];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const pieces: string[] = [];
  let current = "";
  const flush = () => {
    if (current) pieces.push(current);
    current = "";
  };
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      flush();
      pieces.push(...splitAtWords(sentence, maxChars));
      continue;
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > maxChars) {
      flush();
      current = sentence;
    } else {
      current = joined;
    }
  }
  flush();
  return pieces;
}

/**
 * Packs paragraphs into texts of at most maxChars, joined by a blank line so
 * paragraph boundaries survive. A paragraph over the limit is split by
 * splitParagraph first.
 */
export function packParagraphs(
  paragraphs: readonly string[],
  maxChars: number = MAX_PASSAGE_CHARS,
): string[] {
  const units = paragraphs.flatMap((p) => splitParagraph(p, maxChars));
  const texts: string[] = [];
  let current = "";
  for (const unit of units) {
    const joined = current ? `${current}\n\n${unit}` : unit;
    if (current && joined.length > maxChars) {
      texts.push(current);
      current = unit;
    } else {
      current = joined;
    }
  }
  if (current) texts.push(current);
  return texts;
}

/** Turns documents into size-limited passages with stable ids. */
export function passagesFromDocuments(
  documents: readonly CorpusDocument[],
  maxChars: number = MAX_PASSAGE_CHARS,
): CorpusPassage[] {
  const passages: CorpusPassage[] = [];
  for (const doc of documents) {
    for (const section of doc.sections) {
      packParagraphs(section.paragraphs, maxChars).forEach((text, index) => {
        passages.push({
          id: `${doc.docId}#${section.key}:${String(index).padStart(2, "0")}`,
          route: doc.route,
          anchor: section.anchor,
          sectionTitle: section.heading,
          kind: doc.kind,
          text,
        });
      });
    }
  }
  return sortPassages(passages);
}

/** Stable output order. Run before hashing and before writing the file. */
export function sortPassages(
  passages: readonly CorpusPassage[],
): CorpusPassage[] {
  const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...passages].sort(
    (a, b) =>
      byCode(a.route, b.route) ||
      byCode(a.anchor, b.anchor) ||
      byCode(a.id, b.id),
  );
}

/**
 * Content hash over the passages (sorted). Nothing time- or machine-shaped
 * goes in, so unchanged content keeps its revision and any changed fact,
 * id or citation changes it.
 */
export function computeCorpusRevision(
  passages: readonly CorpusPassage[],
): string {
  const canonical = passages.map((p) => [
    p.id,
    p.route,
    p.anchor,
    p.sectionTitle,
    p.kind,
    p.text,
  ]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Routes the corpus must never cite: tailored, development, admin, API and
 *  redirect-only utility routes, and machine-facing files (llms.txt,
 *  llms-full.txt and the like), which are written for crawlers, not readers. */
const EXCLUDED_ROUTE =
  /^\/(for|dev|keystatic|api|off-trail)(\/|$)|^\/llms[^/]*\.txt$/;

/** Text that means a value failed to resolve before it reached the page. */
const BROKEN_VALUE = /\bundefined\b|\bNaN\b|\[object /;

export interface ValidationRules {
  maxChars: number;
  /** Every route a passage may cite. */
  routes: ReadonlySet<string>;
  /** Anchors allowed per route; a route with no entry allows only "". */
  anchors: ReadonlyMap<string, ReadonlySet<string>>;
}

/** Everything wrong with the passages; empty means the corpus is sound. */
export function validateCorpus(
  passages: readonly CorpusPassage[],
  rules: ValidationRules,
): string[] {
  const problems: string[] = [];
  if (passages.length === 0) problems.push("corpus is empty");
  const seen = new Set<string>();
  for (const p of passages) {
    if (seen.has(p.id)) problems.push(`duplicate passage id ${p.id}`);
    seen.add(p.id);
    if (!p.text.trim()) problems.push(`${p.id}: empty text`);
    if (p.text.length > rules.maxChars) {
      problems.push(
        `${p.id}: ${p.text.length} chars exceeds the ${rules.maxChars} limit`,
      );
    }
    if (BROKEN_VALUE.test(p.text) || BROKEN_VALUE.test(p.sectionTitle)) {
      problems.push(`${p.id}: contains an unresolved value`);
    }
    if (EXCLUDED_ROUTE.test(p.route)) {
      problems.push(`${p.id}: cites excluded route ${p.route}`);
    } else if (!rules.routes.has(p.route)) {
      problems.push(`${p.id}: cites unknown route ${p.route}`);
    }
    if (p.anchor && !rules.anchors.get(p.route)?.has(p.anchor)) {
      problems.push(`${p.id}: cites unknown anchor ${p.route}#${p.anchor}`);
    }
  }
  return problems;
}

export function assertValidCorpus(
  passages: readonly CorpusPassage[],
  rules: ValidationRules,
): void {
  const problems = validateCorpus(passages, rules);
  if (problems.length > 0) {
    throw new Error(
      `ask corpus failed validation:\n  ${problems.join("\n  ")}`,
    );
  }
}
