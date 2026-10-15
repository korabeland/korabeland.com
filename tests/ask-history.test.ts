import { describe, expect, it } from "vitest";
import {
  appendQuestion,
  clearHistory,
  HISTORY_KEY,
  loadHistory,
  MAX_HISTORY_ENTRIES,
  MAX_QUESTION_CHARS,
  resolveStore,
  type StorageLike,
} from "@/lib/ask/history";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: StorageLike = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
  return { storage, data };
}

describe("ask history", () => {
  it("keeps questions in order and survives a reload of the module state", () => {
    const { storage } = fakeStorage();
    appendQuestion(storage, "Where are you based?");
    appendQuestion(storage, "What is Perian?");
    expect(loadHistory(storage)).toEqual([
      "Where are you based?",
      "What is Perian?",
    ]);
  });

  it("stores the questions and a version, nothing else", () => {
    const { storage, data } = fakeStorage();
    appendQuestion(storage, "hello");
    expect(
      Object.keys(JSON.parse(data.get(HISTORY_KEY) ?? "{}")).sort(),
    ).toEqual(["q", "v"]);
  });

  it("ignores blank questions and trims long ones", () => {
    const { storage } = fakeStorage();
    appendQuestion(storage, "   ");
    appendQuestion(storage, "x".repeat(MAX_QUESTION_CHARS + 50));
    const [only] = loadHistory(storage);
    expect(loadHistory(storage)).toHaveLength(1);
    expect(only).toHaveLength(MAX_QUESTION_CHARS);
  });

  it("keeps only the newest entries", () => {
    const { storage } = fakeStorage();
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 3; i++) {
      appendQuestion(storage, `question ${i}`);
    }
    const history = loadHistory(storage);
    expect(history).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(history.at(-1)).toBe(`question ${MAX_HISTORY_ENTRIES + 2}`);
  });

  it("clears everything", () => {
    const { storage, data } = fakeStorage();
    appendQuestion(storage, "hello");
    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
    expect(data.size).toBe(0);
  });

  it("treats damaged or foreign data as empty", () => {
    for (const raw of ["not json", '{"v":99,"q":["a"]}', '{"v":1,"q":"a"}']) {
      expect(loadHistory(fakeStorage({ [HISTORY_KEY]: raw }).storage)).toEqual(
        [],
      );
    }
  });

  it("works, without keeping anything, when storage is blocked", () => {
    expect(loadHistory(null)).toEqual([]);
    expect(appendQuestion(null, "hello")).toEqual(["hello"]);
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadHistory(throwing)).toEqual([]);
    expect(() => appendQuestion(throwing, "hello")).not.toThrow();
    expect(() => clearHistory(throwing)).not.toThrow();
  });

  it("falls back to memory for the page when sessionStorage is blocked", () => {
    const store = resolveStore(() => {
      throw new Error("blocked");
    });
    appendQuestion(store, "hello");
    expect(loadHistory(store)).toEqual(["hello"]);
    clearHistory(store);
    expect(loadHistory(store)).toEqual([]);
  });

  it("uses sessionStorage itself when it works", () => {
    const { storage } = fakeStorage();
    expect(resolveStore(() => storage)).toBe(storage);
  });
});
