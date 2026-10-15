// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  assertValidCorpus,
  computeCorpusRevision,
  MAX_PASSAGE_CHARS,
  normalizeInline,
  packParagraphs,
  passagesFromDocuments,
  splitParagraph,
  type ValidationRules,
  validateCorpus,
} from "@/lib/ask/corpus";
import type { CorpusDocument, CorpusPassage } from "@/lib/ask/types";

const words = (n: number, word = "word") =>
  Array.from({ length: n }, () => word).join(" ");

describe("normalizeInline", () => {
  it("collapses every whitespace run, including non-breaking spaces", () => {
    expect(normalizeInline("  a \n\t b  c  ")).toBe("a b c");
  });
});

describe("splitParagraph", () => {
  it("leaves a paragraph within the limit whole", () => {
    expect(splitParagraph("One. Two.", 50)).toEqual(["One. Two."]);
  });

  it("splits at sentence boundaries and loses no text", () => {
    const text = "Alpha one. Beta two is longer. Gamma three. Delta four.";
    const pieces = splitParagraph(text, 30);
    expect(pieces.every((p) => p.length <= 30)).toBe(true);
    expect(pieces.join(" ")).toBe(text);
    expect(pieces[0].endsWith(".")).toBe(true);
    expect(pieces.length).toBeGreaterThan(1);
  });

  it("splits a single over-long sentence at word boundaries", () => {
    const text = `${words(40)}.`;
    const pieces = splitParagraph(text, 50);
    expect(pieces.every((p) => p.length <= 50)).toBe(true);
    expect(pieces.join(" ")).toBe(text);
  });

  it("hard-cuts one token longer than the limit without dropping characters", () => {
    const token = "x".repeat(130);
    const pieces = splitParagraph(`a ${token} b`, 50);
    expect(pieces.every((p) => p.length <= 50)).toBe(true);
    expect(pieces.join("").replaceAll(" ", "")).toBe(`a${token}b`);
  });
});

describe("packParagraphs", () => {
  it("keeps paragraph boundaries as blank lines", () => {
    expect(packParagraphs(["First.", "Second."], 100)).toEqual([
      "First.\n\nSecond.",
    ]);
  });

  it("starts a new text when the next paragraph would overflow", () => {
    expect(packParagraphs(["aaaa", "bbbb", "cccc"], 10)).toEqual([
      "aaaa\n\nbbbb",
      "cccc",
    ]);
  });

  it("splits a long About-style paragraph instead of merging it into one oversized text", () => {
    const long = Array.from(
      { length: 30 },
      (_, i) => `Sentence number ${i} here.`,
    ).join(" ");
    expect(long.length).toBeGreaterThan(MAX_PASSAGE_CHARS - 600);
    const out = packParagraphs([long, long, long], MAX_PASSAGE_CHARS);
    expect(out.length).toBeGreaterThan(1);
    expect(out.every((t) => t.length <= MAX_PASSAGE_CHARS)).toBe(true);
    const rejoined = normalizeInline(out.join(" "));
    expect(rejoined).toBe(normalizeInline([long, long, long].join(" ")));
  });
});

function doc(overrides: Partial<CorpusDocument> = {}): CorpusDocument {
  return {
    docId: "note:a",
    route: "/notes/a",
    kind: "note",
    sections: [
      { key: "head", heading: "A", anchor: "", paragraphs: ["Fact one."] },
    ],
    ...overrides,
  };
}

describe("passagesFromDocuments", () => {
  it("builds stable ids from document and section keys", () => {
    const [p] = passagesFromDocuments([doc()]);
    expect(p.id).toBe("note:a#head:00");
    expect(p.route).toBe("/notes/a");
  });

  it("numbers the parts of a split section", () => {
    const d = doc({
      sections: [
        {
          key: "s",
          heading: "H",
          anchor: "",
          paragraphs: ["a".repeat(8), "b".repeat(8)],
        },
      ],
    });
    expect(passagesFromDocuments([d], 10).map((p) => p.id)).toEqual([
      "note:a#s:00",
      "note:a#s:01",
    ]);
  });

  it("orders output by route, anchor, id regardless of input order", () => {
    const a = doc({ docId: "x:a", route: "/notes/a" });
    const b = doc({ docId: "x:b", route: "/notes/b" });
    expect(passagesFromDocuments([b, a]).map((p) => p.route)).toEqual([
      "/notes/a",
      "/notes/b",
    ]);
  });
});

describe("computeCorpusRevision", () => {
  it("is identical for unchanged content and differs when a fact changes", () => {
    const base = passagesFromDocuments([doc()]);
    const same = passagesFromDocuments([doc()]);
    const changed = passagesFromDocuments([
      doc({
        sections: [
          { key: "head", heading: "A", anchor: "", paragraphs: ["Fact two."] },
        ],
      }),
    ]);
    expect(computeCorpusRevision(same)).toBe(computeCorpusRevision(base));
    expect(computeCorpusRevision(changed)).not.toBe(
      computeCorpusRevision(base),
    );
  });

  it("changes when only a citation changes", () => {
    const a: CorpusPassage[] = passagesFromDocuments([doc()]);
    const b = a.map((p) => ({ ...p, anchor: "other" }));
    expect(computeCorpusRevision(b)).not.toBe(computeCorpusRevision(a));
  });
});

const rules: ValidationRules = {
  maxChars: 100,
  routes: new Set(["/notes/a", "/about"]),
  anchors: new Map([["/about", new Set(["close"])]]),
};
const good: CorpusPassage = {
  id: "p1",
  route: "/notes/a",
  anchor: "",
  sectionTitle: "A",
  kind: "note",
  text: "Fine.",
};

describe("validateCorpus", () => {
  it("accepts a sound corpus", () => {
    expect(validateCorpus([good], rules)).toEqual([]);
  });

  it.each([
    ["an empty corpus", [], /empty/],
    ["a duplicate id", [good, good], /duplicate/],
    ["empty text", [{ ...good, text: "  " }], /empty text/],
    ["an oversized passage", [{ ...good, text: "x".repeat(101) }], /exceeds/],
    [
      "an unresolved value",
      [{ ...good, text: "Relocating to undefined." }],
      /unresolved/,
    ],
    ["an excluded route", [{ ...good, route: "/for/demo" }], /excluded/],
    ["a dev route", [{ ...good, route: "/dev/x" }], /excluded/],
    ["llms.txt", [{ ...good, route: "/llms.txt" }], /excluded/],
    ["llms-full.txt", [{ ...good, route: "/llms-full.txt" }], /excluded/],
    ["an unknown route", [{ ...good, route: "/nope" }], /unknown route/],
    [
      "an anchor the route does not emit",
      [{ ...good, route: "/about", anchor: "ghost" }],
      /unknown anchor/,
    ],
  ] as [
    string,
    CorpusPassage[],
    RegExp,
  ][])("flags %s", (_name, passages, pattern) => {
    expect(validateCorpus(passages, rules).join("\n")).toMatch(pattern);
  });

  it("assertValidCorpus throws with every problem listed", () => {
    expect(() =>
      assertValidCorpus([{ ...good, route: "/for/x" }], rules),
    ).toThrow(/failed validation/);
  });
});
