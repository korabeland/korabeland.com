// @vitest-environment node
// Holds docs/ask-release-questions.md to its contract: forty cases in the
// agreed mix, every case complete, every quoted piece of evidence really
// present in the cited passages of the published content, and no case citing
// a passage that does not exist. The cases are reviewed by Korab (PR 3 gate);
// this test only keeps them honest as the site changes.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeInline } from "@/lib/ask/corpus";
import { buildSiteCorpus } from "@/lib/ask/site";

const FILE = resolve(__dirname, "../docs/ask-release-questions.md");

interface Case {
  id: string;
  title: string;
  question: string;
  answer: string;
  facts: { text: string; evidence: string | null }[];
  forbidden: string;
  sources: string[];
  critical: string;
}

const PREFIX_CATEGORY: Record<string, string> = {
  C: "career",
  P: "project",
  M: "method",
  S: "skill",
  U: "unsupported",
  X: "security",
};
const EXPECTED_COUNTS: Record<string, number> = {
  career: 12,
  project: 8,
  method: 6,
  skill: 4,
  unsupported: 4,
  security: 6,
};

function parseCases(markdown: string): Case[] {
  const blocks = markdown.split(/^### /m).slice(1);
  return blocks.map((block) => {
    const [heading, ...rest] = block.split("\n");
    const body = rest.join("\n");
    const field = (name: string) =>
      body
        .match(new RegExp(`^- \\*\\*${name}:\\*\\*[ \\t]*(.*)$`, "m"))?.[1]
        ?.trim() ?? "";
    const factsBlock =
      body.match(/^- \*\*Expected facts:\*\*\n((?: {2}- .*\n?)+)/m)?.[1] ?? "";
    const facts = factsBlock
      .split("\n")
      .filter((l) => l.trim().startsWith("- "))
      .map((l) => {
        const text = l.trim().slice(2);
        const quoted = text.match(/evidence: "(.+)"\s*$/);
        return { text, evidence: quoted ? quoted[1] : null };
      });
    const [id, title] = heading.split(" · ");
    return {
      id: id.trim(),
      title: (title ?? "").trim(),
      question: field("Question"),
      answer: field("Expected answer"),
      facts,
      forbidden: field("Forbidden claims"),
      sources: [...field("Sources").matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      critical: field("Critical failure"),
    };
  });
}

const cases = parseCases(readFileSync(FILE, "utf8"));

describe("release questions file", () => {
  it("holds forty cases in the agreed mix", () => {
    expect(cases).toHaveLength(40);
    const counts: Record<string, number> = {};
    for (const c of cases) {
      const category = PREFIX_CATEGORY[c.id[0]];
      counts[category] = (counts[category] ?? 0) + 1;
    }
    expect(counts).toEqual(EXPECTED_COUNTS);
    expect(new Set(cases.map((c) => c.id)).size).toBe(40);
  });

  it("gives every case a question, answer type, facts, forbidden claims and critical rule", () => {
    for (const c of cases) {
      expect(c.question, c.id).not.toBe("");
      expect(c.answer, c.id).toMatch(/^supported (answer|refusal)/);
      expect(c.facts.length, c.id).toBeGreaterThan(0);
      expect(c.forbidden, c.id).not.toBe("");
      expect(c.critical, c.id).not.toBe("");
      expect(
        c.sources.length > 0 ||
          /Sources:\*\* none/.test(
            readFileSync(FILE, "utf8").split(`### ${c.id}`)[1].split("### ")[0],
          ),
        c.id,
      ).toBe(true);
    }
  });

  it("leaves every case unticked until Korab reviews it", () => {
    const markdown = readFileSync(FILE, "utf8");
    expect(markdown.match(/^- \[ \] Reviewed by Korab$/gm)).toHaveLength(40);
  });

  it("states the release bar", () => {
    const markdown = readFileSync(FILE, "utf8");
    expect(markdown).toMatch(/at least \*\*36 of 40\*\*/);
    expect(markdown).toMatch(/zero critical failures/);
    expect(markdown).toMatch(
      /useful supported refusal\*\* counts as a success/,
    );
    expect(markdown).toMatch(/Korab must review all forty cases/);
  });

  it("uses no em dashes", () => {
    expect(readFileSync(FILE, "utf8")).not.toContain("—");
  });
});

describe("release questions against the published content", () => {
  it("cites only passages that exist, and every quoted evidence is in them", async () => {
    const { passages } = await buildSiteCorpus();
    const byId = new Map(passages.map((p) => [p.id, normalizeInline(p.text)]));
    for (const c of cases) {
      for (const id of c.sources) {
        expect(byId.has(id), `${c.id}: unknown passage ${id}`).toBe(true);
      }
      const cited = c.sources.map((id) => byId.get(id) ?? "").join(" ");
      for (const fact of c.facts) {
        if (fact.evidence === null) {
          expect(
            fact.text,
            `${c.id}: fact needs evidence or "evidence: none (...)"`,
          ).toMatch(/evidence: none \(/);
          continue;
        }
        expect(
          cited,
          `${c.id}: evidence not found in cited passages: "${fact.evidence}"`,
        ).toContain(normalizeInline(fact.evidence));
      }
    }
  });

  it("gives every supported-answer case at least one quoted piece of evidence", () => {
    for (const c of cases.filter((x) =>
      x.answer.startsWith("supported answer"),
    )) {
      expect(
        c.facts.some((f) => f.evidence !== null),
        c.id,
      ).toBe(true);
    }
  });
});
