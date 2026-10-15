// The Ask section's behaviour, loaded on the About page once the browser is
// idle (or at once if the visitor reaches for it). Search and history run
// entirely in this browser. The only network traffic besides the one-off corpus
// download is a bare event name for the daily counters, and a failure of that
// traffic is ignored.

import {
  appendQuestion,
  clearHistory,
  loadHistory,
  resolveStore,
  type StorageLike,
} from "../../lib/ask/history";
import {
  CONTACT_LINKS,
  ERROR_MESSAGE,
  FALLBACK_MESSAGE,
  READING_LINKS,
} from "../../lib/ask/panel-copy";
import {
  buildIndex,
  type SearchHit,
  type SearchIndex,
  search,
} from "../../lib/ask/search";
import { countOpenOnce, sendEvent } from "../../lib/ask/telemetry-client";
import type { CorpusPassage } from "../../lib/ask/types";

const INDEX_URL = "/ask-index.json";

let store: StorageLike | null = null;

function sessionStore(): StorageLike {
  store ??= resolveStore(() => window.sessionStorage);
  return store;
}

const post = (input: string, init: RequestInit & { keepalive: boolean }) =>
  fetch(input, init);

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(label: string, href: string): HTMLAnchorElement {
  const a = el("a", undefined, label);
  a.href = href;
  return a;
}

function linkLine(
  prefix: string,
  links: readonly { label: string; href: string }[],
): HTMLParagraphElement {
  const p = el("p", "ask-fallback", `${prefix} `);
  links.forEach((l, i) => {
    if (i > 0) p.append(" · ");
    p.append(link(l.label, l.href));
  });
  return p;
}

function renderHit(hit: SearchHit): HTMLLIElement {
  const li = el("li", "ask-hit");
  const head = el("div", "ask-hit-head");
  head.append(el("span", "ask-kind", hit.kindLabel));
  const title = el("a", "ask-hit-title", hit.sectionTitle);
  title.href = hit.href;
  title.dataset.askSourceLink = "";
  head.append(title);
  li.append(head);

  const excerpt = el("p", "ask-excerpt");
  for (const part of hit.excerpt) {
    if (part.match) excerpt.append(el("mark", undefined, part.text));
    else excerpt.append(part.text);
  }
  li.append(excerpt);

  const source = el("p", "ask-source", "Source: ");
  const sourceLink = link(hit.href, hit.href);
  sourceLink.dataset.askSourceLink = "";
  source.append(sourceLink);
  li.append(source);
  return li;
}

type EntryState =
  | { kind: "results"; hits: SearchHit[] }
  | { kind: "fallback" }
  | { kind: "error" };

function entryMeta(state: EntryState): string {
  if (state.kind === "results") {
    const n = state.hits.length;
    return `${n} ${n === 1 ? "source" : "sources"}`;
  }
  return state.kind === "fallback" ? "no match" : "search unavailable";
}

/** One question and what it found. The newest entry starts open; earlier ones
 *  fold away under their question so a long session stays scannable. */
function renderEntry(
  question: string,
  state: EntryState,
  open: boolean,
): HTMLElement {
  const entry = el("details", "ask-entry");
  entry.open = open;
  const summary = el("summary");
  summary.append(el("span", "ask-q", question));
  summary.append(el("span", "ask-q-meta t-mono", entryMeta(state)));
  entry.append(summary);
  if (state.kind === "results") {
    const list = el("ol", "ask-hits");
    for (const hit of state.hits) list.append(renderHit(hit));
    entry.append(list);
  } else {
    entry.append(
      el(
        "p",
        "ask-fallback",
        state.kind === "error" ? ERROR_MESSAGE : FALLBACK_MESSAGE,
      ),
    );
    entry.append(linkLine("Read:", READING_LINKS));
    entry.append(linkLine("Ask me directly:", CONTACT_LINKS));
  }
  return entry;
}

let indexPromise: Promise<SearchIndex> | null = null;

function loadIndex(): Promise<SearchIndex> {
  indexPromise ??= fetch(INDEX_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`index ${response.status}`);
      return response.json() as Promise<{ passages: CorpusPassage[] }>;
    })
    .then((corpus) => buildIndex(corpus.passages))
    .catch((error) => {
      indexPromise = null; // let a later question try again
      throw error;
    });
  return indexPromise;
}

function stateFor(index: SearchIndex | null, question: string): EntryState {
  if (!index) return { kind: "error" };
  try {
    const outcome = search(index, question);
    return outcome.status === "results"
      ? { kind: "results", hits: outcome.hits }
      : { kind: "fallback" };
  } catch {
    return { kind: "error" };
  }
}

let mounted = false;

export function mountAskSection(root: HTMLElement): void {
  if (mounted) return;
  const form = root.querySelector<HTMLFormElement>("[data-ask-form]");
  const input = root.querySelector<HTMLInputElement>("[data-ask-input]");
  const status = root.querySelector<HTMLElement>("[data-ask-status]");
  const history = root.querySelector<HTMLElement>("[data-ask-history]");
  const log = root.querySelector<HTMLElement>("[data-ask-log]");
  if (!form || !input || !status || !history || !log) return;
  mounted = true;
  const store = sessionStore();
  let index: SearchIndex | null = null;
  let historyRevision = 0;

  const paint = () => {
    const questions = loadHistory(store);
    history.hidden = questions.length === 0;
    log.replaceChildren(
      ...[...questions]
        .reverse()
        .map((q, i) => renderEntry(q, stateFor(index, q), i === 0)),
    );
  };

  const ensureIndex = async (): Promise<boolean> => {
    try {
      index = await loadIndex();
      return true;
    } catch {
      index = null;
      return false;
    }
  };

  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question) {
      status.textContent = "Type a question first.";
      input.focus();
      return;
    }
    const revision = historyRevision;
    input.value = "";
    sendEvent("question", post);
    // Save the question before anything is awaited, so leaving the page while
    // the index loads cannot lose it. Clearing history bumps the revision,
    // which stops the pending search from restoring what was cleared.
    appendQuestion(store, question);
    history.hidden = false;
    history.setAttribute("aria-busy", "true");
    status.textContent = "Searching…";
    paint();
    const ready = await ensureIndex();
    if (revision !== historyRevision) return;
    history.setAttribute("aria-busy", "false");
    const state = stateFor(index, question);
    if (!ready) {
      sendEvent("error", post);
    } else if (state.kind === "results") {
      sendEvent("answer", post);
    } else if (state.kind === "fallback") {
      sendEvent("fallback", post);
    } else {
      sendEvent("error", post);
    }
    paint();
    status.textContent =
      state.kind === "results"
        ? `${state.hits.length} ${state.hits.length === 1 ? "source" : "sources"} found for "${question}". The newest result is first under This session.`
        : state.kind === "fallback"
          ? "Nothing on this site answers that. Reading and contact links are listed below."
          : "Search could not load. Reading and contact links are listed below.";
    log.firstElementChild?.scrollIntoView({
      block: "nearest",
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void ask(input.value);
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-ask-example]",
  )) {
    button.addEventListener("click", () => {
      void ask(button.dataset.askExample ?? "");
    });
  }
  root.querySelector("[data-ask-clear]")?.addEventListener("click", () => {
    historyRevision += 1;
    clearHistory(store);
    history.setAttribute("aria-busy", "false");
    paint();
    status.textContent = "History cleared.";
    input.focus();
  });

  // The first time the visitor reaches for the section in a session counts as
  // one open. Showing history carried over from an earlier page does not.
  const countOpen = () => countOpenOnce(sessionStore(), post);
  root.addEventListener("focusin", countOpen, { once: true });
  root.addEventListener("pointerdown", countOpen, { once: true });

  // Warm the index and show any history carried over from earlier pages.
  void ensureIndex().then(paint);
  paint();
}
