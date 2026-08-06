// Corpus-related types for Ask the Operator (U1). Kept separate from
// corpus.ts so later units (the BM25 retriever, the /api/ask endpoint, the
// eval suite) can import just the shapes without pulling in the chunking
// logic itself.

/** Where a chunk's text came from, used by the retriever to weight or filter
 *  results and by the eval suite to report coverage per source. */
export type SourceKind = "project" | "post" | "about" | "status";

/**
 * One retrievable unit of grounding text. `route` + `anchor` together are
 * the citation a chatbot answer can point back to (`anchor` is "" when a
 * section has no natural in-page id, so the citation is just the route).
 */
export interface CorpusChunk {
  /** Stable, globally unique key, e.g. "project:lead-scoring::p000". */
  id: string;
  /** Site-relative path, e.g. "/work/lead-scoring" or "/notes/hello-world". */
  route: string;
  /** In-page fragment id, or "" when the chunk has no heading to anchor to. */
  anchor: string;
  /** Human-readable heading for this chunk (falls back to the document's own
   *  title when the source section had no heading of its own). */
  sectionTitle: string;
  sourceKind: SourceKind;
  /** Normalised, markdown/HTML-noise-stripped text, ≤ 2000 chars unless a
   *  single source paragraph alone exceeds that cap. */
  text: string;
}

/**
 * Bump this when the chunk shape or the chunking rules change in a way a
 * consumer (retriever, eval suite) needs to know about. Deliberately not
 * derived from anything else, this is a hand-set contract version, not a
 * hash.
 */
export const CORPUS_SCHEMA_VERSION = 1;

/**
 * The full generated artifact (src/content/ask-index/corpus.json). No
 * timestamp or build metadata: two runs against unchanged content must
 * produce byte-identical output, and a "generatedAt" field would break that
 * on every single build.
 */
export interface CorpusIndexArtifact {
  schemaVersion: number;
  /** sha256 content hash over the chunk array alone, see
   *  computeCorpusRevision in corpus.ts. Changes iff the grounding text
   *  changes, so a consumer can cheaply tell whether to re-embed/re-index. */
  corpusRevision: string;
  chunks: CorpusChunk[];
}
