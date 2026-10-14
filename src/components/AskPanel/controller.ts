// The Ask panel's behaviour, loaded the first time the panel opens. Search and
// history run entirely in this browser. The only network traffic besides the
// one-off corpus download is a bare event name for the daily counters, and a
// failure of that traffic is ignored.

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
  head.append(title);
  li.append(head);

  const excerpt = el("p", "ask-excerpt");
  for (const part of hit.excerpt) {
    if (part.match) excerpt.append(el("mark", undefined, part.text));
    else excerpt.append(part.text);
  }
  li.append(excerpt);

  const details = el("details");
  details.append(el("summary", undefined, "Show full passage"));
  details.append(el("p", "ask-full", hit.text));
  li.append(details);

  const source = el("p", "ask-source", "Source: ");
  source.append(link(hit.href, hit.href));
  li.append(source);
  return li;
}

type EntryState =
  | { kind: "results"; hits: SearchHit[] }
  | { kind: "fallback" }
  | { kind: "error" };

function renderEntry(question: string, state: EntryState): HTMLElement {
  const article = el("article", "ask-entry");
  article.append(el("h4", "ask-q", question));
  if (state.kind === "results") {
    const list = el("ol", "ask-hits");
    for (const hit of state.hits) list.append(renderHit(hit));
    article.append(list);
  } else {
    article.append(
      el(
        "p",
        "ask-fallback",
        state.kind === "error" ? ERROR_MESSAGE : FALLBACK_MESSAGE,
      ),
    );
    article.append(linkLine("Read:", READING_LINKS));
    article.append(linkLine("Ask directly:", CONTACT_LINKS));
  }
  return article;
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

let wired = false;

function wire(dialog: HTMLDialogElement): void {
  const form = dialog.querySelector<HTMLFormElement>("[data-ask-form]");
  const input = dialog.querySelector<HTMLInputElement>("[data-ask-input]");
  const status = dialog.querySelector<HTMLElement>("[data-ask-status]");
  const history = dialog.querySelector<HTMLElement>("[data-ask-history]");
  const log = dialog.querySelector<HTMLElement>("[data-ask-log]");
  if (!form || !input || !status || !history || !log) return;
  const store = sessionStore();
  let index: SearchIndex | null = null;
  let historyRevision = 0;

  const paint = () => {
    const questions = loadHistory(store);
    history.hidden = questions.length === 0;
    log.replaceChildren(
      ...[...questions]
        .reverse()
        .map((q) => renderEntry(q, stateFor(index, q))),
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

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    const revision = historyRevision;
    input.value = "";
    sendEvent("question", post);
    const ready = await ensureIndex();
    if (revision !== historyRevision) return;
    const questions = appendQuestion(store, question);
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
    history.hidden = questions.length === 0;
    paint();
    status.textContent =
      state.kind === "results"
        ? `${state.hits.length} ${state.hits.length === 1 ? "source" : "sources"} found. Newest result is listed first under This session.`
        : state.kind === "fallback"
          ? "Nothing on this site answers that. Reading and contact links are listed below."
          : "Search could not load. Reading and contact links are listed below.";
    input.focus();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void ask(input.value);
  });
  for (const button of dialog.querySelectorAll<HTMLButtonElement>(
    "[data-ask-example]",
  )) {
    button.addEventListener("click", () => {
      void ask(button.dataset.askExample ?? "");
    });
  }
  dialog.querySelector("[data-ask-clear]")?.addEventListener("click", () => {
    historyRevision += 1;
    clearHistory(store);
    paint();
    status.textContent = "History cleared.";
    input.focus();
  });
  dialog
    .querySelector("[data-ask-close]")
    ?.addEventListener("click", () => dialog.close());
  // A click on the dimmed area outside the panel closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Warm the index and show any history carried over from earlier pages.
  void ensureIndex().then(paint);
  paint();
}

export function openPanel(dialog: HTMLDialogElement): void {
  if (!wired) {
    wired = true;
    wire(dialog);
  }
  if (!dialog.open) {
    dialog.showModal();
    countOpenOnce(sessionStore(), post);
  }
  dialog.querySelector<HTMLInputElement>("[data-ask-input]")?.focus();
}
