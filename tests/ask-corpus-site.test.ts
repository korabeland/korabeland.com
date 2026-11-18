// @vitest-environment node
// Builds the corpus from the repository's real content and holds it to the
// published pages: same readers, same facts, every citation allowed.
import { describe, expect, it } from "vitest";
import { MAX_PASSAGE_CHARS } from "@/lib/ask/corpus";
import { buildSiteCorpus } from "@/lib/ask/site";
import { listProjects } from "@/lib/projects";
import { STATUS } from "@/lib/status";

describe("live site corpus", () => {
  it("covers every project, role, and the About, skills and status facts", async () => {
    const { passages } = await buildSiteCorpus();
    const text = passages.map((p) => p.text).join("\n\n");
    const routes = new Set(passages.map((p) => p.route));

    for (const project of await listProjects()) {
      const href = `/${project.category === "side" ? "lab" : "work"}/${project.slug}`;
      expect(routes, href).toContain(href);
      const facts = passages.find(
        (p) => p.id === `project:${project.slug}#facts:00`,
      );
      if (project.role) {
        expect(facts?.text).toContain(`Role: ${project.role}.`);
      } else {
        expect(facts?.text).not.toContain("Role: .");
      }
      if (project.team) {
        expect(facts?.text).toContain(`Team: ${project.team}.`);
      } else {
        expect(facts?.text).not.toContain("Team: .");
      }
      const ledgerRoute = project.category === "side" ? "/lab" : "/work";
      expect(
        passages.some(
          (passage) =>
            passage.route === ledgerRoute &&
            passage.text.includes(`${project.title}: ${project.outcome}`),
        ),
      ).toBe(true);
    }

    expect(
      new Set(
        passages
          .filter((p) => p.kind === "experience")
          .map((p) => p.id.split("#")[1].split(":")[0]),
      ).size,
    ).toBe(5);
    expect(text).toContain("lifted on-page conversion by 30%");
    expect(text).toContain("30% · on-page conversion lift from the AI chatbot");
    expect(text).toContain("Bachelor of Science in Journalism");
    expect(text).toContain(`Based in ${STATUS.base}. ${STATUS.citizenship}.`);
    expect(text).toContain("Decision-Making with ChatGPT");
  });

  it("indexes the evals scorecard and each published defect", async () => {
    const { passages } = await buildSiteCorpus();
    const evalsPassages = passages.filter(
      (passage) => passage.route === "/lab/evals",
    );
    const evalsText = evalsPassages.map((passage) => passage.text).join("\n");
    const evalsHeadings = evalsPassages.map((passage) => passage.sectionTitle);

    expect(evalsText).toContain("qwen3.8:27b-dflash2-nvfp4-64k");
    expect(evalsText).toContain("259 attempts, 76% pass rate");
    expect(evalsText).toContain("qwen3.8:27b-mlx-64k");
    expect(evalsText).toContain("180 attempts, 78% pass rate");
    expect(evalsText).toContain("qwen3.6-35b-a3b");
    expect(evalsText).toContain("255 attempts, 53% pass rate");
    expect(evalsHeadings).toContain("A model reply limit was dropped");
    expect(evalsText).toContain("ignored the configured reply limit");
    expect(evalsHeadings).toContain("An agent wrote outside its workspace");
    expect(evalsText).toContain("macOS write confinement");
    expect(evalsHeadings).toContain("A timed-out request could be retried");
    expect(evalsText).toContain("refuses replacement requests for that run");
  });

  it("never indexes llms.txt or any other machine-facing llms file", async () => {
    const { passages } = await buildSiteCorpus();
    expect(passages.length).toBeGreaterThan(0);
    for (const p of passages) {
      expect(p.route, p.id).not.toMatch(/llms[^/]*\.txt/i);
      expect(p.id, p.id).not.toMatch(/^llms/i);
    }
    // Wording that exists only in public/llms.txt must not leak in.
    const text = passages.map((p) => p.text).join("\n\n");
    expect(text).not.toContain("Do not describe Korab Eland as");
    expect(text).not.toContain("accurate things to say include");
  });

  it("holds every passage to the size limit and never prints an unresolved value", async () => {
    const { passages, maxPassageChars } = await buildSiteCorpus();
    expect(maxPassageChars).toBe(MAX_PASSAGE_CHARS);
    for (const p of passages) {
      expect(p.text.length, p.id).toBeLessThanOrEqual(MAX_PASSAGE_CHARS);
      expect(p.text, p.id).not.toMatch(/undefined|Relocating|NaN|\[object/);
    }
  });

  it("splits the long About paragraphs at paragraph boundaries without losing text", async () => {
    const { passages } = await buildSiteCorpus();
    const { ABOUT_NARRATIVE } = await import("@/lib/about");
    const narrative = passages.filter((p) =>
      p.id.startsWith("about#narrative"),
    );
    expect(narrative.length).toBeGreaterThan(1);
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    expect(flat(narrative.map((p) => p.text).join(" "))).toBe(
      flat(ABOUT_NARRATIVE.join(" ")),
    );
    expect(narrative[0].text).toContain("\n\n");
  });

  it("excludes tailored, development, admin and generated-feed routes", async () => {
    const { passages } = await buildSiteCorpus();
    for (const p of passages) {
      expect(p.route, p.id).not.toMatch(
        /^\/(for|dev|keystatic|api|off-trail)(\/|$)|^\/llms[^/]*\.txt$/,
      );
      expect([
        "note",
        "project",
        "experience",
        "skills",
        "about",
        "status",
      ]).toContain(p.kind);
    }
  });

  it("keeps its revision when nothing changed", async () => {
    const a = await buildSiteCorpus();
    const b = await buildSiteCorpus();
    expect(a.corpusRevision).toBe(b.corpusRevision);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
