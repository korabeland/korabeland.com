// Shapes for the Ask the Operator corpus. Kept apart from the logic in
// corpus.ts so later consumers (search panel, answer endpoint, evaluation
// suite) can import the types without pulling in the builder.

/** Which part of the site a passage came from; consumers can weight or filter by it. */
export type PassageKind =
  | "note"
  | "project"
  | "experience"
  | "skills"
  | "about"
  | "status"
  | "llms";

/**
 * One retrievable unit of grounding text. `route` plus `anchor` is the
 * citation: `anchor` is "" when the rendered page has no element id for the
 * passage, so the citation is the route alone.
 */
export interface CorpusPassage {
  /** Stable key, e.g. "project:lead-scoring#outcome:00". */
  id: string;
  /** Site-relative path, e.g. "/work/lead-scoring" or "/llms.txt". */
  route: string;
  /** Element id the rendered page emits for this section, or "". */
  anchor: string;
  /** Human-readable heading for the passage. */
  sectionTitle: string;
  kind: PassageKind;
  /** Plain text. Paragraphs are separated by a blank line ("\n\n"). */
  text: string;
}

/** A block of text in reading order: what a page shows, before size splitting. */
export interface CorpusSection {
  /** Stable part of the passage id, unique within its document. */
  key: string;
  heading: string;
  anchor: string;
  paragraphs: readonly string[];
}

/** One routed document made of sections. */
export interface CorpusDocument {
  /** Stable id prefix, e.g. "project:lead-scoring". */
  docId: string;
  route: string;
  kind: PassageKind;
  sections: readonly CorpusSection[];
}

/**
 * Bump when the passage shape or the splitting rules change in a way a
 * consumer needs to know about. A hand-set contract number, not a hash.
 */
export const CORPUS_SCHEMA_VERSION = 2;

/** The generated artifact (src/content/ask-index/corpus.json). It carries no
 *  timestamp: two runs over unchanged content must be byte-identical. */
export interface CorpusArtifact {
  schemaVersion: number;
  /** sha256 over the passages alone. Changes if and only if the grounding
   *  text, its ids or its citations change. */
  corpusRevision: string;
  /** The size limit every passage was held to. */
  maxPassageChars: number;
  passages: CorpusPassage[];
}
