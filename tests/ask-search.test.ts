// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/panel-copy";
import { buildIndex, search, stem, tokenize } from "@/lib/ask/search";
import { buildSiteCorpus } from "@/lib/ask/site";
import type { CorpusPassage } from "@/lib/ask/types";

const passage = (
  id: string,
  text: string,
  over: Partial<CorpusPassage> = {},
): CorpusPassage => ({
  id,
  route: `/work/${id}`,
  anchor: "",
  sectionTitle: id,
  kind: "project",
  text,
  ...over,
});

describe("tokenize and stem", () => {
  it("drops apostrophes and punctuation", () => {
    expect(tokenize("Pascal's Nebula, 27.8%!")).toEqual([
      "pascals",
      "nebula",
      "27",
      "8",
    ]);
  });
  it("brings word forms together", () => {
    expect(stem("tiers")).toBe(stem("tiering"));
    expect(stem("scoring")).toBe(stem("scored"));
    expect(stem("scoring")).toBe(stem("score"));
    expect(stem("companies")).toBe("company");
  });
});

describe("search over fixtures", () => {
  const index = buildIndex([
    passage(
      "a",
      "The decile model scores each lead on its expected conversion.",
    ),
    passage("b", "Paid search cost per lead fell by half."),
    passage("c", "Based in Washington, DC.", {
      route: "/about",
      anchor: "close",
      sectionTitle: "Location and citizenship",
      kind: "status",
    }),
  ]);

  it("ranks the passage that holds the words first", () => {
    const outcome = search(index, "how does the decile model score leads?");
    expect(outcome.status).toBe("results");
    expect(outcome.hits[0].id).toBe("a");
  });

  it("builds a citation with the anchor when the page has one", () => {
    const outcome = search(index, "where do you live");
    expect(outcome.status).toBe("results");
    expect(outcome.hits[0].href).toBe("/about#close");
  });

  it("falls back for an empty question, stop words only, or unknown words", () => {
    for (const q of ["", "   ", "what is the", "favourite pizza topping"]) {
      expect(search(index, q).status, q).toBe("fallback");
    }
  });

  it("falls back when under half of the question's words appear together", () => {
    expect(search(index, "decile poem about cats").status).toBe("fallback");
  });

  it("marks matched words inside the excerpt", () => {
    const outcome = search(index, "paid search");
    const marked = outcome.hits[0].excerpt
      .filter((p) => p.match)
      .map((p) => p.text.toLowerCase());
    expect(marked).toEqual(expect.arrayContaining(["paid", "search"]));
    expect(outcome.hits[0].excerpt.map((p) => p.text).join("")).toContain(
      "Paid search cost per lead",
    );
  });

  it("returns the same order every time", () => {
    const a = search(index, "lead").hits.map((h) => h.id);
    const b = search(index, "lead").hits.map((h) => h.id);
    expect(a).toEqual(b);
  });

  it("limits long questions rather than failing", () => {
    expect(() => search(index, "lead ".repeat(500))).not.toThrow();
  });
});

describe("search over the live corpus", () => {
  it("finds a supported page for every example question", async () => {
    const { passages } = await buildSiteCorpus();
    const index = buildIndex(passages);
    for (const q of EXAMPLE_QUESTIONS) {
      const outcome = search(index, q);
      expect(outcome.status, q).toBe("results");
    }
  });

  it.each([
    ["Where are you based?", "/about#close"],
    ["What results did the lead scoring project get?", "/work/lead-scoring"],
    ["What is Perian?", "/lab/perian"],
    ["Do you need a visa sponsored?", "/llms.txt"],
    ["Which certifications do you hold?", "/about#skills-heading"],
    ["What did you do at Plattform Education?", "/about#experience-heading"],
  ])("puts a relevant source in the top results for %s", async (q, href) => {
    const { passages } = await buildSiteCorpus();
    const outcome = search(buildIndex(passages), q);
    expect(outcome.hits.map((h) => h.href)).toContain(href);
  });

  it.each([
    "What is your favourite pizza topping?",
    "What is the weather in Paris today?",
    "Write me a poem about cats",
  ])("offers reading or contact instead of a weak match for %s", async (q) => {
    const { passages } = await buildSiteCorpus();
    expect(search(buildIndex(passages), q).status).toBe("fallback");
  });

  it("every hit cites a passage that exists in the corpus", async () => {
    const { passages } = await buildSiteCorpus();
    const ids = new Set(passages.map((p) => p.id));
    const outcome = search(buildIndex(passages), "lead scoring decile model");
    for (const hit of outcome.hits) expect(ids.has(hit.id)).toBe(true);
  });
});
