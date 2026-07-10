// shift-parity.test.ts — drift guard between the two required copies of the
// shift precedence logic: the pure `resolveShift()` in src/lib/shift.ts
// (Vitest-covered, see tests/shift.test.ts) and the `is:inline` head script
// in src/layouts/BaseLayout.astro, which can't import a module and stay
// render-blocking, so its resolution logic is a hand-kept duplicate.
//
// This test reads BaseLayout.astro at test time, extracts the inline
// script's body between the SHIFT-RESOLVE markers, and evaluates it in a
// node:vm sandbox with stubbed document/location/localStorage/sessionStorage
// /Date — then asserts the resolved shift matches resolveShift() across the
// same precedence truth table tests/shift.test.ts exercises. If someone
// edits the inline script's precedence order without updating shift.ts (or
// vice versa), this test fails.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { type ResolveShiftInput, resolveShift } from "@/lib/shift";

const BASE_LAYOUT_PATH = resolve(__dirname, "../src/layouts/BaseLayout.astro");

function extractInlineShiftScript(): string {
  const source = readFileSync(BASE_LAYOUT_PATH, "utf8");
  const markerMatch = source.match(
    /SHIFT-RESOLVE:START([\s\S]*?)SHIFT-RESOLVE:END/,
  );
  if (!markerMatch) {
    throw new Error(
      "Could not find SHIFT-RESOLVE:START/END markers in BaseLayout.astro — " +
        "the inline shift script may have moved. Update the markers or this extractor.",
    );
  }
  const scriptMatch = markerMatch[1].match(
    /<script is:inline>([\s\S]*?)<\/script>/,
  );
  if (!scriptMatch) {
    throw new Error(
      "Found SHIFT-RESOLVE markers but no <script is:inline> block inside them.",
    );
  }
  return scriptMatch[1];
}

interface StorageStub {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  writes: Array<[string, string]>;
}

function makeStorageStub(initialValue: string | null | undefined): StorageStub {
  let value = initialValue ?? null;
  const writes: Array<[string, string]> = [];
  return {
    getItem: () => value,
    setItem: (key: string, v: string) => {
      writes.push([key, v]);
      value = v;
    },
    writes,
  };
}

interface InlineShiftResult {
  /** The resolved shift written to document.documentElement.dataset.time. */
  shift: string | undefined;
  /** The colour swapped into the theme-color meta tag. */
  themeColor: string | undefined;
  /** True if the script persisted a freshly-computed shift to sessionStorage. */
  sessionWrite: [string, string] | undefined;
}

/**
 * Runs the extracted inline script in an isolated node:vm sandbox with
 * controlled inputs, mirroring the shape of resolveShift()'s ResolveShiftInput
 * so every case in the precedence truth table can drive both implementations
 * from the same fixture.
 */
function runInlineShift(
  scriptBody: string,
  input: ResolveShiftInput,
): InlineShiftResult {
  const documentDataset: { time?: string } = {};
  const metaAttr = { content: "" };
  const documentStub = {
    documentElement: { dataset: documentDataset },
    querySelector: (selector: string) =>
      selector === 'meta[name="theme-color"]'
        ? {
            getAttribute: () => metaAttr.content,
            setAttribute: (_name: string, v: string) => {
              metaAttr.content = v;
            },
          }
        : null,
  };

  const search =
    input.query != null ? `?shift=${encodeURIComponent(input.query)}` : "";
  const locationStub = { search };

  const localStorageStub = makeStorageStub(input.stored);
  const sessionStorageStub = makeStorageStub(input.sessionDefault);

  class DateStub {
    getHours() {
      return input.hour;
    }
  }

  const sandbox: Record<string, unknown> = {
    document: documentStub,
    location: locationStub,
    localStorage: localStorageStub,
    sessionStorage: sessionStorageStub,
    URLSearchParams,
    Date: DateStub,
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(scriptBody, sandbox);

  return {
    shift: documentDataset.time,
    themeColor: metaAttr.content || undefined,
    sessionWrite: sessionStorageStub.writes[0],
  };
}

// The same precedence truth table tests/shift.test.ts exercises against
// resolveShift() directly — this table drives both implementations so a
// divergence in either copy fails here.
const CASES: Array<{ name: string; input: ResolveShiftInput }> = [
  { name: "stored day wins over any hour", input: { stored: "day", hour: 2 } },
  {
    name: "stored night wins over any hour",
    input: { stored: "night", hour: 14 },
  },
  {
    name: "no stored, no session, hour 14 resolves to day and persists the session default",
    input: { hour: 14 },
  },
  {
    name: "no stored, no session, hour 22 resolves to night and persists the session default",
    input: { hour: 22 },
  },
  { name: "boundary hour 7 resolves to day", input: { hour: 7 } },
  { name: "boundary hour 18 resolves to day", input: { hour: 18 } },
  { name: "boundary hour 19 resolves to night", input: { hour: 19 } },
  { name: "boundary hour 6 resolves to night", input: { hour: 6 } },
  {
    name: "query day overrides stored night and hour, and does not persist",
    input: { query: "day", stored: "night", hour: 22 },
  },
  {
    name: "query night overrides stored day and hour, and does not persist",
    input: { query: "night", stored: "day", hour: 10 },
  },
  {
    name: "invalid query is ignored and falls through to stored",
    input: { query: "dusk", stored: "day", hour: 22 },
  },
  {
    name: "invalid stored value is ignored and falls through to session default",
    input: { stored: "bogus", sessionDefault: "night", hour: 10 },
  },
  {
    name: "invalid stored and invalid session fall through to computing from hour",
    input: { stored: "bogus", sessionDefault: "also-bogus", hour: 10 },
  },
  {
    name: "valid session default wins over hour when no stored choice exists",
    input: { sessionDefault: "night", hour: 10 },
  },
];

describe("shift-parity — inline head script vs resolveShift()", () => {
  const scriptBody = extractInlineShiftScript();

  it.each(CASES)("$name", ({ input }) => {
    const pure = resolveShift(input);
    const inline = runInlineShift(scriptBody, input);

    expect(inline.shift).toBe(pure.shift);
    expect(inline.themeColor).toBe(
      pure.shift === "day" ? "#f2f1ea" : "#16181c",
    );

    if (pure.sessionToPersist) {
      expect(inline.sessionWrite).toEqual([
        "korab-shift-session",
        pure.sessionToPersist,
      ]);
    } else {
      expect(inline.sessionWrite).toBeUndefined();
    }
  });

  // Every hour of the day, cross-checked against every precedence layer —
  // the exhaustive sweep the spec calls for, beyond the boundary spot-checks
  // above.
  it.each(
    Array.from({ length: 24 }, (_, hour) => hour),
  )("hour %i alone (no query/stored/session) matches resolveShift()", (hour) => {
    const pure = resolveShift({ hour });
    const inline = runInlineShift(scriptBody, { hour });
    expect(inline.shift).toBe(pure.shift);
  });
});
