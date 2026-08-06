// Pure chunking and normalisation for the Ask the Operator corpus index
// (U1). No DOM, no fs, no network: every input is a plain string or object,
// so the whole module runs under Vitest with fixture content, the same
// purity discipline as src/lib/shift-log.ts. The one node: import is
// node:crypto for computeCorpusRevision, a pure hash over already-built
// data with no I/O of its own, so it stays inside that contract.
//
// scripts/gen-corpus-index.ts owns the actual reading (content tree,
// about.astro markers, STATUS constants) and calls into this module to turn
// raw text into chunks.

import { createHash } from "node:crypto";
import type { CorpusChunk, SourceKind } from "./types";

/** Sections longer than this are split at paragraph boundaries, never
 *  mid-paragraph. A single paragraph over the cap ships as its own
 *  oversized chunk, see splitOversizedBody. */
export const MAX_CHUNK_CHARS = 2000;

export interface RawSection {
  /** Heading text with surrounding markdown emphasis left in place (the
   *  caller normalises it), or null for text that precedes the first
   *  heading, including the entire document when it has no headings at
   *  all. */
  heading: string | null;
  /** Section body with the heading line removed, trimmed. */
  body: string;
}

/** A section that already carries the anchor it should chunk under: a real
 *  DOM id (the about-page HTML pipeline) or "" when the rendered page has
 *  no matching fragment (all markdown sources today). Shared shape so both
 *  pipelines can hand off to the same chunk assembler. */
export interface AnchoredSection {
  heading: string | null;
  anchor: string;
  body: string;
}

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_LINE = /^\s*(```|~~~)/;

/**
 * Heading-aware section split. Any ATX heading (levels 1-6) starts a new
 * section; everything before the first heading, or the whole document when
 * there are none, becomes a single heading-less section. A `#` inside a
 * fenced code block is ignored so a code comment never gets mistaken for a
 * heading. Empty sections (a heading immediately followed by another
 * heading, or a document that is only whitespace) are dropped rather than
 * emitted as blank chunks.
 */
export function splitMarkdownIntoSections(markdown: string): RawSection[] {
  const lines = markdown.split("\n");
  const sections: RawSection[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (body.length > 0) sections.push({ heading, body });
    buffer = [];
  };

  for (const line of lines) {
    if (FENCE_LINE.test(line)) inFence = !inFence;
    const headingMatch = !inFence ? line.match(ATX_HEADING) : null;
    if (headingMatch) {
      flush();
      heading = headingMatch[2].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

/**
 * Splits a section body at paragraph boundaries (blank-line-separated) so
 * no chunk exceeds maxChars, never cutting a paragraph in half. Paragraphs
 * are packed greedily: as many as fit are joined with a blank line, then a
 * fresh group starts. A single paragraph that alone exceeds maxChars ships
 * whole as its own oversized chunk. Splitting inside a paragraph would cut
 * a sentence mid-thought, which is worse for a grounding corpus than one
 * chunk running over the cap.
 */
export function splitOversizedBody(
  body: string,
  maxChars: number = MAX_CHUNK_CHARS,
): string[] {
  if (body.length <= maxChars) return [body];

  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return [];

  const groups: string[] = [];
  let current: string[] = [];

  const currentText = () => current.join("\n\n");

  for (const paragraph of paragraphs) {
    const candidateLength =
      current.length > 0
        ? currentText().length + 2 + paragraph.length
        : paragraph.length;
    if (current.length > 0 && candidateLength > maxChars) {
      groups.push(currentText());
      current = [paragraph];
    } else {
      current.push(paragraph);
    }
  }
  if (current.length > 0) groups.push(currentText());

  return groups;
}

/**
 * Strips markdown syntax noise for indexing while keeping the human-
 * readable text: images and links keep their visible text and drop the
 * target, bold/italic markers and inline-code backticks are removed, and
 * blockquote/list markers at the start of a line are dropped. Not a full
 * markdown parser, this is deliberately just enough for this site's plain
 * prose bodies (no tables, no nested markdoc tags in practice today).
 * Collapses all whitespace runs to single spaces at the end, so the result
 * reads as one indexable block of text rather than reproducing the
 * original line breaks.
 */
export function normalizeChunkText(markdown: string): string {
  let text = markdown;
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/(\*\*\*|___)([\s\S]+?)\1/g, "$2");
  text = text.replace(/(\*\*|__)([\s\S]+?)\1/g, "$2");
  text = text.replace(/(\*|_)([\s\S]+?)\1/g, "$2");
  text = text.replace(/`([^`]*)`/g, "$1");
  text = text
    .split("\n")
    .map((line) => line.replace(/^\s*(>|[-*+]|\d+\.)\s+/, ""))
    .join("\n");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Turns pre-anchored sections into corpus chunks, splitting any oversized
 * section at paragraph boundaries. Shared by the markdown pipeline
 * (buildDocumentChunks, which passes fallbackAnchor through) and the
 * about-page HTML pipeline in scripts/gen-corpus-index.ts, which already
 * has the page's real heading ids to reuse verbatim.
 */
export function chunksFromAnchoredSections(
  sections: readonly AnchoredSection[],
  options: {
    route: string;
    sourceKind: SourceKind;
    /** Stable per-document key, e.g. "post:hello-world". Combined with a
     *  running part index to build each chunk's id. */
    docId: string;
    /** sectionTitle for a heading-less section, normally the document's own
     *  title. */
    fallbackTitle: string;
    maxChars?: number;
  },
): CorpusChunk[] {
  const {
    route,
    sourceKind,
    docId,
    fallbackTitle,
    maxChars = MAX_CHUNK_CHARS,
  } = options;
  const chunks: CorpusChunk[] = [];
  let partIndex = 0;

  for (const section of sections) {
    const sectionTitle = section.heading ?? fallbackTitle;
    for (const part of splitOversizedBody(section.body, maxChars)) {
      chunks.push({
        id: `${docId}::p${String(partIndex).padStart(3, "0")}`,
        route,
        anchor: section.anchor,
        sectionTitle,
        sourceKind,
        text: normalizeChunkText(part),
      });
      partIndex++;
    }
  }

  return chunks;
}

export interface BuildDocumentChunksInput {
  route: string;
  sourceKind: SourceKind;
  docId: string;
  /** Markdown/markdoc body text, frontmatter already stripped by the
   *  caller. */
  markdown: string;
  fallbackTitle: string;
  /** Anchor used for the heading-less section (usually the leading prose
   *  before any heading, or the whole document when it has none). Defaults
   *  to "", meaning the citation is the route alone, no fragment. */
  fallbackAnchor?: string;
  maxChars?: number;
}

/**
 * The markdown pipeline: heading-aware section split, oversized-section
 * splitting, and text normalisation, glued together into ready-to-write
 * CorpusChunk objects. A document with no headings at all (the common case
 * for this site's post and project bodies) becomes a single section under
 * fallbackAnchor.
 *
 * Every markdown-sourced section gets fallbackAnchor ("" by default), NOT a
 * slug derived from its heading: the site renders .mdoc bodies through
 * Markdoc's default transform (src/components/PostContent.tsx), which emits
 * headings with no id attribute, so a derived fragment like
 * "#what-this-site-is" would land at the top of the page — a citation that
 * silently lies about its precision. sectionTitle still names the section
 * for display. If the renderer ever emits heading ids, reinstate slug
 * derivation here in the same change, so the two cannot drift apart.
 */
export function buildDocumentChunks(
  input: BuildDocumentChunksInput,
): CorpusChunk[] {
  const {
    route,
    sourceKind,
    docId,
    markdown,
    fallbackTitle,
    fallbackAnchor = "",
    maxChars = MAX_CHUNK_CHARS,
  } = input;

  const rawSections = splitMarkdownIntoSections(markdown);
  const anchored: AnchoredSection[] = rawSections.map((section) => ({
    heading: section.heading,
    anchor: fallbackAnchor,
    body: section.body,
  }));

  return chunksFromAnchoredSections(anchored, {
    route,
    sourceKind,
    docId,
    fallbackTitle,
    maxChars,
  });
}

export interface HtmlSection {
  /** Plain-text heading (HTML tags stripped), or null for content before
   *  the first heading. */
  heading: string | null;
  /** The heading element's own `id` attribute, verbatim, or "" when there
   *  is no heading to anchor to. */
  anchor: string;
  /** Plain-text body (HTML tags stripped, links keep their visible text). */
  body: string;
}

const HTML_HEADING = /<h[1-6]\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h[1-6]>/g;

function stripHtmlTags(html: string): string {
  let text = html;
  // Anchors keep their visible text, the href is markup noise for indexing.
  text = text.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, "$1");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/**
 * Section split for a raw HTML snippet (the extracted about-page prose),
 * keyed on `<h1>`-`<h6>` elements that carry a real `id` attribute. Reuses
 * that id verbatim as the anchor, since it is the actual DOM id the page
 * renders, more precise than re-deriving a slug from the heading text. Text
 * before the first heading, if any, becomes a heading-less section.
 */
export function splitHtmlIntoSections(html: string): HtmlSection[] {
  const matches: {
    anchor: string;
    heading: string;
    start: number;
    end: number;
  }[] = [];
  let match: RegExpExecArray | null = HTML_HEADING.exec(html);
  while (match !== null) {
    matches.push({
      anchor: match[1],
      heading: stripHtmlTags(match[2]),
      start: match.index,
      end: match.index + match[0].length,
    });
    match = HTML_HEADING.exec(html);
  }

  const sections: HtmlSection[] = [];

  const leadingText = stripHtmlTags(
    matches.length > 0 ? html.slice(0, matches[0].start) : html,
  );
  if (leadingText.length > 0) {
    sections.push({ heading: null, anchor: "", body: leadingText });
  }

  for (let i = 0; i < matches.length; i++) {
    const sectionEnd =
      i + 1 < matches.length ? matches[i + 1].start : html.length;
    const body = stripHtmlTags(html.slice(matches[i].end, sectionEnd));
    if (body.length > 0) {
      sections.push({
        heading: matches[i].heading,
        anchor: matches[i].anchor,
        body,
      });
    }
  }

  return sections;
}

/**
 * Content hash over the chunk array alone: schemaVersion is deliberately
 * excluded (a version bump must not read as a content change), and nothing
 * timestamp-shaped goes in, which is the whole point of this being
 * reproducible. Callers must sort chunks (route, anchor, id) before calling
 * this, the hash is over serialization order, so an unsorted call would
 * make the revision order-dependent for no reason.
 */
export function computeCorpusRevision(chunks: readonly CorpusChunk[]): string {
  const canonical = chunks.map((c) => ({
    id: c.id,
    route: c.route,
    anchor: c.anchor,
    sectionTitle: c.sectionTitle,
    sourceKind: c.sourceKind,
    text: c.text,
  }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
