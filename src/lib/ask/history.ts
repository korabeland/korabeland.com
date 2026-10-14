// Per-tab search history. Pure: storage is passed in, so Vitest drives it with
// a fake. It lives in sessionStorage only, which is what makes it survive page
// navigation inside a tab and vanish when the tab's session ends. It holds
// the typed questions and nothing else; results are recomputed from the
// published index each time they are shown. Nothing here touches the network.

export const HISTORY_KEY = "korab-ask-history";
export const HISTORY_VERSION = 1;
export const MAX_HISTORY_ENTRIES = 10;
export const MAX_QUESTION_CHARS = 200;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function cleanQuestion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const q = value.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_CHARS);
  return q || null;
}

/** Oldest first. Anything unreadable or from another version is dropped. */
export function loadHistory(storage: StorageLike | null): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { v?: unknown; q?: unknown };
    if (parsed?.v !== HISTORY_VERSION || !Array.isArray(parsed.q)) return [];
    return parsed.q
      .map(cleanQuestion)
      .filter((q): q is string => q !== null)
      .slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function save(storage: StorageLike | null, questions: string[]): void {
  if (!storage) return;
  try {
    storage.setItem(
      HISTORY_KEY,
      JSON.stringify({ v: HISTORY_VERSION, q: questions }),
    );
  } catch {
    // Storage blocked or full: search still works, it just won't be kept.
  }
}

/** Adds a question and returns the new history. Blank questions are ignored. */
export function appendQuestion(
  storage: StorageLike | null,
  question: string,
): string[] {
  const q = cleanQuestion(question);
  const current = loadHistory(storage);
  if (!q) return current;
  const next = [...current, q].slice(-MAX_HISTORY_ENTRIES);
  save(storage, next);
  return next;
}

export function clearHistory(storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(HISTORY_KEY);
  } catch {
    // Nothing more to do: the key could not be removed.
  }
}

/**
 * The storage to use: the browser's sessionStorage when it works, otherwise an
 * in-memory stand-in so search and history still behave for the life of the
 * page (they just won't survive navigation).
 */
export function resolveStore(candidate: () => StorageLike): StorageLike {
  try {
    const store = candidate();
    const probe = `${HISTORY_KEY}-probe`;
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    const data = new Map<string, string>();
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
      removeItem: (key) => void data.delete(key),
    };
  }
}
