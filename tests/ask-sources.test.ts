// @vitest-environment node
import Markdoc from "@markdoc/markdoc";
import { describe, expect, it } from "vitest";
import { findBrokenCitations } from "@/lib/ask/citations";
import { computeCorpusRevision, passagesFromDocuments } from "@/lib/ask/corpus";
import { blocksFromMarkdoc } from "@/lib/ask/markdoc";
import {
  aboutDocument,
  experienceDocument,
  noteDocument,
  projectDocument,
  projectLedgerDocument,
  sectionsFromBlocks,
  skillsDocument,
  statusDocument,
} from "@/lib/ask/sources";
import type { ExperienceSummary } from "@/lib/experience";
import type { ProjectSummary } from "@/lib/projects";

const parse = (source: string) => ({ node: Markdoc.parse(source) });

describe("blocksFromMarkdoc", () => {
  it("keeps paragraphs and headings apart and flattens inline formatting", () => {
    const blocks = blocksFromMarkdoc(
      parse(
        "Intro with **bold** and [a link](https://x.test).\n\n## Section\n\nSecond `code` paragraph.\nSame paragraph.",
      ),
    );
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Intro with bold and a link." },
      { kind: "heading", text: "Section" },
      { kind: "paragraph", text: "Second code paragraph. Same paragraph." },
    ]);
  });

  it("turns list items into separate paragraphs", () => {
    const blocks = blocksFromMarkdoc(parse("- one\n- two"));
    expect(blocks.map((b) => b.text)).toEqual(["one", "two"]);
  });

  it("stops on a node type it does not understand", () => {
    expect(() =>
      blocksFromMarkdoc(parse("| a | b |\n|---|---|\n| 1 | 2 |")),
    ).toThrow(/unsupported/);
  });
});

describe("sectionsFromBlocks", () => {
  it("groups text under the heading that precedes it, with no invented anchor", () => {
    const sections = sectionsFromBlocks(
      [
        { kind: "paragraph", text: "Lead." },
        { kind: "heading", text: "Next" },
        { kind: "paragraph", text: "Body." },
      ],
      "Title",
    );
    expect(sections.map((s) => [s.heading, s.anchor, s.paragraphs])).toEqual([
      ["Title", "", ["Lead."]],
      ["Next", "", ["Body."]],
    ]);
  });

  it("drops a heading that has no text under it", () => {
    expect(
      sectionsFromBlocks([{ kind: "heading", text: "Empty" }], "Title"),
    ).toEqual([]);
  });
});

const project = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  slug: "demo",
  title: "Demo project",
  description: "A demo.",
  category: "work",
  role: "Lead",
  team: "Growth, IT",
  stack: "",
  outcome: "",
  startedAt: "2026-01-01",
  shippedAt: "2026-05-01",
  heroImage: null,
  tags: [],
  outcomeMetrics: [
    { value: "30%", label: "Lift", provenance: "Measured over 8 weeks" },
  ],
  fieldLog: [{ week: "W1", title: "Kickoff", body: "Started." }],
  reflection: "It worked.",
  nextProject: "",
  ...overrides,
});

describe("projectDocument", () => {
  it("states role, team, span and status as the page prints them, and skips empty ones", () => {
    const doc = projectDocument({ project: project(), body: [] });
    const facts = doc.sections[0].paragraphs.at(-1) ?? "";
    expect(facts).toBe(
      "Role: Lead. Team: Growth, IT. Span: 2026 · 4 months. Status: shipped.",
    );
    expect(facts).not.toMatch(/Stack|undefined|—/);
  });

  it("routes by category and cites only ids the case-study layout emits", () => {
    const work = projectDocument({ project: project(), body: [] });
    const lab = projectDocument({
      project: project({ category: "side" }),
      body: [],
    });
    expect(work.route).toBe("/work/demo");
    expect(lab.route).toBe("/lab/demo");
    expect(work.sections.map((s) => s.anchor).filter(Boolean)).toEqual([
      "outcome-heading",
      "log-heading",
      "reflection-heading",
    ]);
  });

  it("keeps each result with its basis", () => {
    const doc = projectDocument({ project: project(), body: [] });
    const outcome = doc.sections.find((s) => s.key === "outcome");
    expect(outcome?.paragraphs).toEqual([
      "Lift: 30%. Basis: Measured over 8 weeks",
    ]);
  });

  it("marks an unshipped project as in flight", () => {
    const doc = projectDocument({
      project: project({ shippedAt: null }),
      body: [],
    });
    expect(doc.sections[0].paragraphs.at(-1)).toContain("Status: in flight.");
  });
});

describe("projectLedgerDocument", () => {
  it("cites each published outcome on the matching work or lab ledger", () => {
    const projects = [
      project({ outcome: "measured conversion lift" }),
      project({ slug: "lab-demo", category: "side", outcome: "daily driver" }),
    ];
    const work = projectLedgerDocument(projects, "work");
    const lab = projectLedgerDocument(projects, "side");
    expect(work.route).toBe("/work");
    expect(work.sections[0].paragraphs).toEqual([
      "Demo project: measured conversion lift",
    ]);
    expect(lab.route).toBe("/lab");
    expect(lab.sections[0].paragraphs).toEqual(["Demo project: daily driver"]);
  });

  it("changes the corpus revision when only a published outcome changes", () => {
    const original = project({ outcome: "daily driver" });
    const revised = { ...original, outcome: "built for daily use" };
    const revision = (item: ProjectSummary) =>
      computeCorpusRevision(
        passagesFromDocuments([projectLedgerDocument([item], "work")]),
      );
    expect(revision(revised)).not.toBe(revision(original));
  });
});

describe("noteDocument", () => {
  it("leads with title, description and the printed date", () => {
    const doc = noteDocument({
      slug: "n",
      title: "A note",
      description: "About things.",
      dateLabel: "2026.07.11",
      body: [{ kind: "paragraph", text: "Body." }],
    });
    expect(doc.route).toBe("/notes/n");
    expect(doc.sections[0].paragraphs).toEqual([
      "A note",
      "About things.",
      "Published 2026.07.11.",
    ]);
  });
});

const role = (
  overrides: Partial<ExperienceSummary> = {},
): ExperienceSummary => ({
  slug: "r1",
  company: "Acme",
  role: "Manager",
  location: "Melbourne, Australia",
  startDate: "2021-03-01",
  endDate: null,
  current: true,
  achievements: [
    {
      text: "Built a chatbot that lifted conversion by 30%.",
      metric: { value: "30%", label: "conversion lift" },
    },
    { text: "Plain bullet.", metric: null },
  ],
  tags: [],
  testimonial: { quote: "Great.", attribution: "A Boss", sourceUrl: null },
  ...overrides,
});

describe("experienceDocument", () => {
  it("keeps each role's facts together under the experience heading", () => {
    const doc = experienceDocument([role()]);
    const [section] = doc.sections;
    expect(section.anchor).toBe("experience-heading");
    expect(section.paragraphs[0]).toBe(
      "Manager at Acme, Melbourne, Australia, 2021–present (current role).",
    );
    expect(section.paragraphs[1]).toContain("30% · conversion lift");
    expect(section.paragraphs.at(-1)).toBe(
      'Recommendation from A Boss: "Great."',
    );
  });
});

describe("skillsDocument", () => {
  it("covers skills, education and certifications and omits absent groups", () => {
    const doc = skillsDocument({
      categories: [{ name: "Data", skills: ["SQL", "Python"] }],
      education: [{ name: "BSc", institution: "Uni", year: "2013" }],
      certifications: [],
    });
    expect(doc.sections.map((s) => s.key)).toEqual(["skills", "education"]);
    expect(doc.sections[0].paragraphs).toEqual(["Data: SQL, Python."]);
    expect(doc.sections[1].paragraphs).toEqual(["BSc, Uni, 2013."]);
  });
});

describe("aboutDocument and statusDocument", () => {
  it("cites the About page's real section ids", () => {
    const doc = aboutDocument(["One.", "Two."]);
    expect(doc.sections.map((s) => s.anchor)).toEqual([
      "narrative",
      "operate",
      "hiring",
    ]);
    expect(doc.sections[0].paragraphs).toEqual(["One.", "Two."]);
  });

  it("indexes team and role-specific budgets as rendered on About", () => {
    const hiring = aboutDocument([]).sections.find(
      (section) => section.key === "hiring",
    );
    expect(hiring?.paragraphs).toContain(
      "Scope I have managed: Largest team: 5 people. As Marketing Manager, I managed an annual budget of $1M to $5M. As Digital Media Buyer at Plattform Education, which became Keypath, I managed about $12M a year in paid media (about $1M a month). Most recent role: Customer Experience Manager at Keypath Education, 2021 to August 2026 (ended).",
    );
  });

  it("states location and citizenship without a relocation clause", () => {
    const text = statusDocument({
      base: "Washington, DC",
      citizenship: "US and Australian citizen",
    }).sections[0].paragraphs[0];
    expect(text).toBe("Based in Washington, DC. US and Australian citizen.");
    expect(text).not.toMatch(/relocat|undefined/i);
  });
});

describe("findBrokenCitations", () => {
  const passages = passagesFromDocuments([
    {
      docId: "a",
      route: "/about",
      kind: "about",
      sections: [
        { key: "s", heading: "H", anchor: "close", paragraphs: ["x"] },
      ],
    },
    {
      docId: "b",
      route: "/gone",
      kind: "note",
      sections: [{ key: "s", heading: "H", anchor: "", paragraphs: ["y"] }],
    },
  ]);

  it("reports a missing route and a missing anchor, and accepts real ones", () => {
    const pages: Record<string, string> = { "/about": '<h2 id="close">x</h2>' };
    expect(findBrokenCitations(passages, (r) => pages[r] ?? null)).toEqual([
      "/gone: route is not in the build output",
    ]);
    pages["/about"] = "<h2>no id</h2>";
    expect(
      findBrokenCitations(passages, (r) => pages[r] ?? null).join("\n"),
    ).toContain('no element with id="close"');
  });
});
