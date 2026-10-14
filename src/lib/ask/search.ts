// Local search over the Ask the Operator corpus. Pure: the index is built from
// passages in hand, so Vitest runs it with fixtures and the browser runs it on
// the published corpus. No model call, no embeddings, no network. Ranking is
// plain BM25 with light stemming, a title boost and a small hand-written
// synonym table for the questions visitors actually ask ("where do you live").

import type { CorpusPassage, PassageKind } from "./types";

export const MAX_QUERY_CHARS = 200;
export const MAX_HITS = 4;
const MAX_HITS_PER_ROUTE = 2;
const EXCERPT_CHARS = 320;
/** A passage must match at least this share of the question's terms. */
const MIN_COVERAGE = 0.5;
const TITLE_BOOST = 1.5;
const SYNONYM_WEIGHT = 0.5;
const K1 = 1.2;
const B = 0.75;

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have how i if in into is it its " +
    "just me my of on or our so than that the their them then there these they this to us was we were what when " +
    "where which who whom why will with would you your yours about tell please give show find any some korab " +
    "eland his he him she her not no yes also very more most much many other such only own same too s t " +
    "ive im id youre whats hows whos need needs want wants get got"
  ).split(" "),
);

// Question vocabulary mapped to the words the pages actually use. Matching a
// synonym counts for the original word, at half weight.
const SYNONYMS: Record<string, string[]> = {
  live: ["based", "washington", "location"],
  living: ["based", "washington", "location"],
  located: ["based", "washington", "location"],
  location: ["based", "washington"],
  city: ["based", "washington"],
  country: ["citizen", "australian"],
  citizen: ["citizenship", "australian"],
  nationality: ["citizen", "citizenship"],
  passport: ["citizen", "citizenship"],
  visa: ["sponsorship", "citizen", "authorization"],
  sponsorship: ["visa", "citizen"],
  sponsor: ["sponsorship", "visa"],
  sponsored: ["sponsorship", "visa"],
  authorised: ["authorization", "citizen"],
  authorized: ["authorization", "citizen"],
  hire: ["open", "roles", "employment"],
  hiring: ["open", "roles", "employment"],
  job: ["roles", "employment", "open"],
  jobs: ["roles", "employment", "open"],
  available: ["open", "roles"],
  availability: ["open", "roles"],
  freelance: ["employment", "freelancing"],
  remote: ["washington", "roles"],
  employer: ["keypath", "plattform", "education"],
  employers: ["keypath", "plattform", "education"],
  company: ["keypath", "plattform", "education"],
  companies: ["keypath", "plattform", "education"],
  worked: ["keypath", "plattform"],
  experience: ["keypath", "plattform", "manager", "specialist"],
  career: ["narrative", "keypath", "manager"],
  history: ["narrative", "keypath"],
  degree: ["education", "bachelor", "university"],
  degrees: ["education", "bachelor", "university"],
  university: ["education", "bachelor"],
  school: ["education", "bachelor", "university"],
  studied: ["education", "bachelor", "university"],
  study: ["education", "bachelor"],
  certificate: ["certifications"],
  certificates: ["certifications"],
  course: ["certifications", "education"],
  courses: ["certifications", "education"],
  tool: ["skills", "analytics"],
  tools: ["skills", "analytics"],
  tech: ["skills", "analytics"],
  stack: ["skills", "analytics"],
  strengths: ["skills"],
  results: ["outcome", "lifted", "cut"],
  result: ["outcome", "lifted", "cut"],
  impact: ["outcome", "lifted", "cut"],
  achievements: ["outcome", "lifted", "cut"],
  chatbot: ["chat"],
  bot: ["chat", "chatbot"],
  sms: ["text", "messaging"],
  models: ["model"],
  contact: ["email", "linkedin"],
  reach: ["email", "linkedin"],
  email: ["contact"],
  blog: ["notes", "note"],
  writing: ["notes", "note"],
  posts: ["notes", "note"],
  manager: ["managed", "led"],
  team: ["led", "team"],
  leadership: ["led", "team", "stakeholder"],
};

const ALIAS_KIND_LABEL: Record<PassageKind, string> = {
  note: "Note",
  project: "Project",
  experience: "Career",
  skills: "Skills",
  about: "About",
  status: "About",
  llms: "Summary",
};

export function kindLabel(kind: PassageKind): string {
  return ALIAS_KIND_LABEL[kind];
}

/** Lower-case word tokens; apostrophes vanish so "Pascal's" is "pascals". */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** A deliberately small stemmer: plural, -ing, -ed and a trailing e. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (
    w.length > 3 &&
    w.endsWith("s") &&
    !w.endsWith("ss") &&
    !w.endsWith("us") &&
    !w.endsWith("is")
  ) {
    w = w.slice(0, -1);
  }
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

function contentStems(text: string): string[] {
  return tokenize(text)
    .filter((t) => !STOPWORDS.has(t))
    .map(stem);
}

interface IndexedPassage {
  passage: CorpusPassage;
  termFreq: Map<string, number>;
  titleTerms: Set<string>;
  length: number;
}

export interface SearchIndex {
  docs: IndexedPassage[];
  docFreq: Map<string, number>;
  averageLength: number;
}

export function buildIndex(passages: readonly CorpusPassage[]): SearchIndex {
  const docs: IndexedPassage[] = [];
  const docFreq = new Map<string, number>();
  let total = 0;
  for (const passage of passages) {
    const titleTerms = new Set(contentStems(passage.sectionTitle));
    const termFreq = new Map<string, number>();
    const stems = [
      ...contentStems(passage.text),
      ...contentStems(passage.sectionTitle),
    ];
    for (const term of stems) {
      termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
    }
    for (const term of termFreq.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
    docs.push({ passage, termFreq, titleTerms, length: stems.length });
    total += stems.length;
  }
  return {
    docs,
    docFreq,
    averageLength: docs.length ? total / docs.length : 0,
  };
}

/** One question word, with the page words it may also stand for. */
interface TermGroup {
  term: string;
  synonyms: string[];
}

function queryGroups(query: string): TermGroup[] {
  const groups: TermGroup[] = [];
  const seen = new Set<string>();
  for (const token of tokenize(query.slice(0, MAX_QUERY_CHARS))) {
    if (STOPWORDS.has(token)) continue;
    const term = stem(token);
    if (seen.has(term)) continue;
    seen.add(term);
    const synonyms = (SYNONYMS[token] ?? [])
      .map((s) => stem(s.replace(/['’]/g, "")))
      .filter((s) => s !== term);
    groups.push({ term, synonyms: [...new Set(synonyms)] });
  }
  return groups;
}

export interface ExcerptPart {
  text: string;
  match: boolean;
}

export interface SearchHit {
  id: string;
  route: string;
  anchor: string;
  /** Route plus "#anchor" when the page has one. */
  href: string;
  sectionTitle: string;
  kind: PassageKind;
  kindLabel: string;
  score: number;
  /** The passage in full, for the "show full passage" disclosure. */
  text: string;
  excerpt: ExcerptPart[];
}

export type SearchOutcome =
  | { status: "results"; query: string; hits: SearchHit[] }
  | { status: "fallback"; query: string; hits: [] };

export function citationHref(route: string, anchor: string): string {
  return anchor ? `${route}#${anchor}` : route;
}

function bm25(index: SearchIndex, doc: IndexedPassage, term: string): number {
  const tf = doc.termFreq.get(term) ?? 0;
  if (tf === 0) return 0;
  const n = index.docFreq.get(term) ?? 0;
  const idf = Math.log(1 + (index.docs.length - n + 0.5) / (n + 0.5));
  const norm = 1 - B + B * (doc.length / (index.averageLength || 1));
  const score = (idf * (tf * (K1 + 1))) / (tf + K1 * norm);
  return doc.titleTerms.has(term) ? score * TITLE_BOOST : score;
}

function splitUnits(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((u) => u.trim())
    .filter(Boolean);
}

function markParts(text: string, matched: ReadonlySet<string>): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  const word = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu;
  let last = 0;
  const push = (value: string, match: boolean) => {
    if (!value) return;
    const prev = parts[parts.length - 1];
    if (prev && prev.match === match) prev.text += value;
    else parts.push({ text: value, match });
  };
  for (const m of text.matchAll(word)) {
    const start = m.index ?? 0;
    push(text.slice(last, start), false);
    const lower = m[0].toLowerCase().replace(/['’]/g, "");
    push(m[0], matched.has(stem(lower)));
    last = start + m[0].length;
  }
  push(text.slice(last), false);
  return parts;
}

function trimAround(text: string, matched: ReadonlySet<string>): string {
  if (text.length <= EXCERPT_CHARS) return text;
  const word = /[\p{L}\p{N}][\p{L}\p{N}'’]*/gu;
  let centre = 0;
  for (const m of text.matchAll(word)) {
    if (matched.has(stem(m[0].toLowerCase().replace(/['’]/g, "")))) {
      centre = m.index ?? 0;
      break;
    }
  }
  let start = Math.max(0, centre - Math.floor(EXCERPT_CHARS / 3));
  let end = Math.min(text.length, start + EXCERPT_CHARS);
  start = Math.max(0, end - EXCERPT_CHARS);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < centre) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > start + EXCERPT_CHARS / 2) end = space;
  }
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

function buildExcerpt(
  text: string,
  matched: ReadonlySet<string>,
): ExcerptPart[] {
  const units = splitUnits(text);
  if (units.length === 0) return [];
  const unitScore = (u: string) =>
    new Set(contentStems(u).filter((s) => matched.has(s))).size;
  let best = 0;
  let bestScore = -1;
  units.forEach((u, i) => {
    const s = unitScore(u);
    if (s > bestScore) {
      best = i;
      bestScore = s;
    }
  });
  let excerpt = units[best];
  const next = units[best + 1];
  if (next && `${excerpt} ${next}`.length <= EXCERPT_CHARS) {
    excerpt = `${excerpt} ${next}`;
  }
  return markParts(trimAround(excerpt, matched), matched);
}

/**
 * Ranks passages against a question. `fallback` means nothing in the index
 * answers it well enough to show: empty question, no matching words, or fewer
 * than half the question's words found together in any one passage.
 */
export function search(index: SearchIndex, query: string): SearchOutcome {
  const trimmed = query.trim().slice(0, MAX_QUERY_CHARS);
  const groups = queryGroups(trimmed);
  if (groups.length === 0) {
    return { status: "fallback", query: trimmed, hits: [] };
  }

  const scored: { doc: IndexedPassage; score: number; matched: Set<string> }[] =
    [];
  for (const doc of index.docs) {
    let score = 0;
    let groupsMatched = 0;
    const matched = new Set<string>();
    for (const group of groups) {
      let groupScore = bm25(index, doc, group.term);
      if (groupScore > 0) matched.add(group.term);
      for (const synonym of group.synonyms) {
        const s = bm25(index, doc, synonym) * SYNONYM_WEIGHT;
        if (s > 0) matched.add(synonym);
        groupScore += s;
      }
      if (groupScore > 0) groupsMatched += 1;
      score += groupScore;
    }
    if (score > 0 && groupsMatched / groups.length >= MIN_COVERAGE) {
      scored.push({ doc, score, matched });
    }
  }
  if (scored.length === 0) {
    return { status: "fallback", query: trimmed, hits: [] };
  }

  scored.sort(
    (a, b) =>
      b.score - a.score || (a.doc.passage.id < b.doc.passage.id ? -1 : 1),
  );
  const perRoute = new Map<string, number>();
  const hits: SearchHit[] = [];
  for (const { doc, score, matched } of scored) {
    const { passage } = doc;
    const used = perRoute.get(passage.route) ?? 0;
    if (used >= MAX_HITS_PER_ROUTE) continue;
    perRoute.set(passage.route, used + 1);
    hits.push({
      id: passage.id,
      route: passage.route,
      anchor: passage.anchor,
      href: citationHref(passage.route, passage.anchor),
      sectionTitle: passage.sectionTitle,
      kind: passage.kind,
      kindLabel: kindLabel(passage.kind),
      score,
      text: passage.text,
      excerpt: buildExcerpt(passage.text, matched),
    });
    if (hits.length === MAX_HITS) break;
  }
  return { status: "results", query: trimmed, hits };
}
