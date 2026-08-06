// Fixture-driven coverage for the Ask the Operator corpus pipeline (U1):
// the pure chunking/normalisation library (src/lib/ask/corpus.ts) and the
// disk-facing assembly it feeds (scripts/gen-corpus-index.ts). Everything
// here passes plain strings/objects in, mirroring the shift-parity/coverage-
// sync idiom of testing pure logic with fixtures rather than a live reader,
// except for the "real content" block, which deliberately reads the actual
// repo tree the same way tests/coverage-sync.test.ts cross-checks the
// Keystatic reader against an independent fs glob.

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDocumentChunks,
  computeCorpusRevision,
  githubSlug,
  MAX_CHUNK_CHARS,
  normalizeChunkText,
  splitHtmlIntoSections,
  splitMarkdownIntoSections,
  splitOversizedBody,
} from "@/lib/ask/corpus";
import { STATUS } from "@/lib/status";
import {
  type AssembleCorpusInput,
  assembleCorpus,
  buildStatusSections,
  extractAboutProse,
  isPostPublished,
  isProjectPublished,
  parseFrontmatterBlock,
  parseMdocFile,
} from "../scripts/gen-corpus-index";

function mdoc(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

const PUBLISHED_POST = mdoc(
  "slug: hello-note\ntitle: Hello Note\ndescription: A short note.\npublishedAt: '2026-01-05'",
  "This post has no headings, so its whole body is one section.\n\nIt has a second paragraph too.\n",
);

const DRAFT_POST_NO_PUBLISHED_AT = mdoc(
  "slug: unfinished-note\ntitle: Unfinished Note\ndescription: Not ready.",
  "SECRET_DRAFT_MARKER: this text must never reach the corpus.\n",
);

const DRAFT_POST_EXPLICIT_STATUS = mdoc(
  "slug: shelved-note\ntitle: Shelved Note\ndescription: Shelved.\npublishedAt: '2026-01-05'\nstatus: draft",
  "SECRET_STATUS_DRAFT_MARKER: this text must never reach the corpus either.\n",
);

const PUBLISHED_PROJECT = mdoc(
  "slug: widget-factory\ntitle: Widget Factory\ncategory: work\ndescription: A test project.",
  "A single-paragraph body with no headings at all, well under the chunk cap.\n",
);

const SIDE_PROJECT = mdoc(
  "slug: tinker-thing\ntitle: Tinker Thing\ncategory: side\ndescription: A lab project.",
  "Side-category projects route under /lab instead of /work.\n",
);

const ABOUT_FIXTURE = `<article>
  <header>irrelevant header prose that must not appear</header>
  <!-- ABOUT-PROSE:START -->
  <section>
    <h2 id="narrative">Career narrative</h2>
    <p>The thread across thirteen years is the <strong>same one</strong> every time.</p>
  </section>
  <section>
    <h2 id="operate">how I operate</h2>
    <p>I run my own work with a backlog, see <a href="/notes/system-designer-personal-os">the full system</a>.</p>
  </section>
  <!-- ABOUT-PROSE:END -->
  <footer>irrelevant footer prose that must not appear</footer>
</article>`;

function fixtureInput(
  overrides: Partial<AssembleCorpusInput> = {},
): AssembleCorpusInput {
  return {
    projectDocs: [
      { slug: "widget-factory", raw: PUBLISHED_PROJECT },
      { slug: "tinker-thing", raw: SIDE_PROJECT },
    ],
    postDocs: [
      { slug: "hello-note", raw: PUBLISHED_POST },
      { slug: "unfinished-note", raw: DRAFT_POST_NO_PUBLISHED_AT },
      { slug: "shelved-note", raw: DRAFT_POST_EXPLICIT_STATUS },
    ],
    aboutAstroSource: ABOUT_FIXTURE,
    statusFacts: {
      base: "Testville",
      target: "Sampleburg",
      citizenship: "Testland citizen",
      authorization: "no sponsorship required",
      nationalities: ["Testland"],
    },
    ...overrides,
  };
}

describe("assembleCorpus: happy path", () => {
  const chunks = assembleCorpus(fixtureInput());

  it("carries correct route/anchor/sectionTitle for a headingless post", () => {
    const chunk = chunks.find((c) => c.route === "/notes/hello-note");
    expect(chunk).toBeDefined();
    expect(chunk?.anchor).toBe("");
    expect(chunk?.sectionTitle).toBe("Hello Note");
    expect(chunk?.sourceKind).toBe("post");
    expect(chunk?.text).toContain("no headings");
  });

  it("routes a work project under /work and a side project under /lab", () => {
    expect(chunks.some((c) => c.route === "/work/widget-factory")).toBe(true);
    expect(chunks.some((c) => c.route === "/lab/tinker-thing")).toBe(true);
  });

  it("excludes a draft post with no publishedAt", () => {
    const allText = chunks.map((c) => c.text).join(" ");
    expect(allText).not.toContain("SECRET_DRAFT_MARKER");
    expect(chunks.some((c) => c.route === "/notes/unfinished-note")).toBe(
      false,
    );
  });

  it("excludes a post explicitly marked status: draft even with publishedAt set", () => {
    const allText = chunks.map((c) => c.text).join(" ");
    expect(allText).not.toContain("SECRET_STATUS_DRAFT_MARKER");
    expect(chunks.some((c) => c.route === "/notes/shelved-note")).toBe(false);
  });

  it("extracts the about-page prose with the page's real heading ids as anchors", () => {
    const narrative = chunks.find(
      (c) => c.sourceKind === "about" && c.anchor === "narrative",
    );
    const operate = chunks.find(
      (c) => c.sourceKind === "about" && c.anchor === "operate",
    );
    expect(narrative?.text).toContain("same one every time");
    expect(operate?.text).toContain("the full system");
    // Emphasis/link markup is stripped, the visible text survives.
    expect(narrative?.text).not.toContain("<strong>");
    expect(operate?.text).not.toContain("<a href");
  });

  it("never includes prose from outside the ABOUT-PROSE markers", () => {
    const allText = chunks.map((c) => c.text).join(" ");
    expect(allText).not.toContain("irrelevant header prose");
    expect(allText).not.toContain("irrelevant footer prose");
  });

  it("emits status fact chunks under /about with the injected STATUS values", () => {
    const location = chunks.find(
      (c) => c.sourceKind === "status" && c.anchor === "location",
    );
    expect(location?.route).toBe("/about");
    expect(location?.text).toContain("Testville");
    expect(location?.text).toContain("Sampleburg");
  });
});

describe("splitMarkdownIntoSections: heading-aware chunking", () => {
  it("splits a multi-heading document into one section per heading", () => {
    const sections = splitMarkdownIntoSections(
      "## First Section\nFirst body.\n\n## Second Section\nSecond body.\n",
    );
    expect(sections).toEqual([
      { heading: "First Section", body: "First body." },
      { heading: "Second Section", body: "Second body." },
    ]);
  });

  it("returns a single heading-less section for a document with no headings", () => {
    const sections = splitMarkdownIntoSections(
      "Just a plain paragraph.\n\nAnd another one.",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBeNull();
    expect(sections[0].body).toContain("Just a plain paragraph.");
  });

  it("does not crash on an empty document", () => {
    expect(splitMarkdownIntoSections("")).toEqual([]);
    expect(splitMarkdownIntoSections("   \n\n  ")).toEqual([]);
  });

  it("ignores a '#' inside a fenced code block", () => {
    const sections = splitMarkdownIntoSections(
      "## Real Heading\nSome text.\n\n```\n# not a heading\n```\nMore text.\n",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Real Heading");
    expect(sections[0].body).toContain("# not a heading");
  });
});

describe("githubSlug + buildDocumentChunks: anchors", () => {
  it("derives a GitHub-style slug from a heading", () => {
    expect(githubSlug("How I Operate")).toBe("how-i-operate");
    expect(githubSlug("AI, Data & Product")).toBe("ai-data-product");
  });

  it("dedupes a genuinely repeated heading the way GitHub does (bare, then -1)", () => {
    const chunks = buildDocumentChunks({
      route: "/notes/x",
      sourceKind: "post",
      docId: "post:x",
      fallbackTitle: "X",
      markdown: "## Overview\nFirst.\n\n## Overview\nSecond.\n",
    });
    expect(chunks.map((c) => c.anchor)).toEqual(["overview", "overview-1"]);
  });
});

describe("splitOversizedBody: the 2000-char cap", () => {
  it("returns the body untouched when it is under the cap", () => {
    expect(splitOversizedBody("short body", 2000)).toEqual(["short body"]);
  });

  it("splits at a paragraph boundary, never mid-paragraph, and stays under the cap", () => {
    const paragraph = (n: number) => `Paragraph ${n}. `.repeat(60); // ~900 chars
    const body = [paragraph(1), paragraph(2), paragraph(3)].join("\n\n");
    const groups = splitOversizedBody(body, 2000);
    expect(groups.length).toBeGreaterThan(1);
    for (const group of groups) {
      expect(group.length).toBeLessThanOrEqual(2000);
    }
    // No paragraph text was dropped or duplicated.
    expect(groups.join("\n\n")).toBe(body);
  });

  it("ships a single paragraph that alone exceeds the cap as its own oversized chunk", () => {
    const hugeParagraph = "x".repeat(2500);
    const body = `${hugeParagraph}\n\nA short trailing paragraph.`;
    const groups = splitOversizedBody(body, 2000);
    expect(groups).toEqual([hugeParagraph, "A short trailing paragraph."]);
    expect(groups[0].length).toBeGreaterThan(2000);
  });

  it("real chunking end-to-end: no emitted chunk exceeds the cap, and every part of the same oversized section shares its anchor", () => {
    const paragraph = (n: number) => `Sentence about topic ${n}. `.repeat(50);
    const markdown = `## Long Section\n${[1, 2, 3, 4].map(paragraph).join("\n\n")}\n`;
    const chunks = buildDocumentChunks({
      route: "/notes/y",
      sourceKind: "post",
      docId: "post:y",
      fallbackTitle: "Y",
      markdown,
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
      expect(chunk.anchor).toBe("long-section");
    }
  });
});

describe("normalizeChunkText: markdown noise stripping", () => {
  it("keeps link/image text and drops the target", () => {
    expect(normalizeChunkText("See [the docs](https://example.com/x).")).toBe(
      "See the docs.",
    );
    expect(normalizeChunkText("![an alt text](img.png)")).toBe("an alt text");
  });

  it("strips bold/italic markers and inline code backticks", () => {
    expect(normalizeChunkText("A **decile model** scores each `lead`.")).toBe(
      "A decile model scores each lead.",
    );
  });

  it("collapses whitespace/newlines into single spaces", () => {
    expect(normalizeChunkText("Line one.\n\nLine two.   Line three.")).toBe(
      "Line one. Line two. Line three.",
    );
  });
});

describe("splitHtmlIntoSections: about-page extraction", () => {
  it("uses the heading element's real id as the anchor", () => {
    const sections = splitHtmlIntoSections(
      '<h2 id="narrative">Career narrative</h2><p>Body text.</p>',
    );
    expect(sections).toEqual([
      { heading: "Career narrative", anchor: "narrative", body: "Body text." },
    ]);
  });

  it("does not crash on HTML with no headings", () => {
    expect(splitHtmlIntoSections("<p>Just a paragraph.</p>")).toEqual([
      { heading: null, anchor: "", body: "Just a paragraph." },
    ]);
  });
});

describe("extractAboutProse: marker extraction", () => {
  it("extracts the HTML between START and END", () => {
    const source =
      "before\n<!-- ABOUT-PROSE:START -->\n<p>kept</p>\n<!-- ABOUT-PROSE:END -->\nafter";
    expect(extractAboutProse(source)).toContain("<p>kept</p>");
    expect(extractAboutProse(source)).not.toContain("before");
    expect(extractAboutProse(source)).not.toContain("after");
  });

  it("throws naming the marker when the closing marker is missing", () => {
    const source = "<!-- ABOUT-PROSE:START -->\n<p>kept</p>\n";
    expect(() => extractAboutProse(source)).toThrow(/ABOUT-PROSE:END/);
  });

  it("throws naming the marker when the opening marker is missing", () => {
    const source = "<p>no markers here</p>";
    expect(() => extractAboutProse(source)).toThrow(/ABOUT-PROSE:START/);
  });
});

describe("frontmatter parsing: the apostrophe gotcha", () => {
  it("unescapes a doubled single-quote into a literal apostrophe", () => {
    const fm = parseFrontmatterBlock(
      "title: 'It wasn''t that simple'\nslug: test-post",
    );
    expect(fm.title).toBe("It wasn't that simple");
    expect(fm.slug).toBe("test-post");
  });

  it("still handles the plain/quoted/folded conventions the sync parser relies on", () => {
    const fm = parseFrontmatterBlock(
      [
        "slug: hello-world",
        "publishedAt: '2026-04-17'",
        "description: >-",
        "  A folded block scalar",
        "  across two lines.",
      ].join("\n"),
    );
    expect(fm.slug).toBe("hello-world");
    expect(fm.publishedAt).toBe("2026-04-17");
    expect(fm.description).toBe("A folded block scalar across two lines.");
  });
});

describe("isPostPublished / isProjectPublished", () => {
  it("gates posts on publishedAt, not a status field that does not exist in the schema", () => {
    expect(isPostPublished({ publishedAt: "2026-01-01" })).toBe(true);
    expect(isPostPublished({})).toBe(false);
    expect(isPostPublished({ publishedAt: "" })).toBe(false);
    expect(
      isPostPublished({ publishedAt: "2026-01-01", status: "draft" }),
    ).toBe(false);
  });

  it("treats every project as published unless explicitly marked status: draft", () => {
    expect(isProjectPublished({})).toBe(true);
    expect(isProjectPublished({ category: "side" })).toBe(true);
    expect(isProjectPublished({ status: "draft" })).toBe(false);
  });
});

describe("parseMdocFile", () => {
  it("throws a clear error for a file with no frontmatter block", () => {
    expect(() =>
      parseMdocFile("just some text, no frontmatter", "test file"),
    ).toThrow(/test file/);
  });
});

describe("determinism", () => {
  it("produces deep-equal artifacts and an identical corpusRevision across two runs", () => {
    const runA = assembleCorpus(fixtureInput());
    const runB = assembleCorpus(fixtureInput());
    expect(runA).toEqual(runB);
    expect(computeCorpusRevision(runA)).toBe(computeCorpusRevision(runB));
  });

  it("changes the corpusRevision when a single character of content changes", () => {
    const baseline = assembleCorpus(fixtureInput());
    const changed = assembleCorpus(
      fixtureInput({
        postDocs: [
          {
            slug: "hello-note",
            raw: PUBLISHED_POST.replace("headings", "headingz"),
          },
        ],
      }),
    );
    expect(computeCorpusRevision(baseline)).not.toBe(
      computeCorpusRevision(changed),
    );
  });
});

describe("buildStatusSections", () => {
  it("emits location and citizenship as separate fact groups", () => {
    const sections = buildStatusSections({
      base: "Melbourne",
      target: "Washington, DC",
      citizenship: "US and Australian citizen",
      authorization: "no US visa sponsorship required",
      nationalities: ["United States", "Australia"],
    });
    expect(sections).toHaveLength(2);
    expect(sections[0].body).toContain("Melbourne");
    expect(sections[0].body).toContain("Washington, DC");
    expect(sections[1].body).toContain("US and Australian citizen");
    expect(sections[1].body).toContain("United States and Australia");
  });
});

// Real-content exclusion guard: reads the actual repo tree the way
// tests/coverage-sync.test.ts independently fs-globs content rather than
// trusting the code path under test. public/llms.txt and src/content/for/
// are never read by assembleCorpus's inputs at all (AssembleCorpusInput has
// no field for either), this asserts that structural exclusion actually
// holds against real, distinctive text from both.
describe("real content: exclusion guard and a live spot-check", () => {
  const repoRoot = resolve(__dirname, "..");
  const projectsDir = resolve(repoRoot, "src/content/projects");
  const postsDir = resolve(repoRoot, "src/content/posts");

  function readDocs(dir: string) {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        slug: entry.name,
        raw: readFileSync(resolve(dir, entry.name, "index.mdoc"), "utf8"),
      }));
  }

  const chunks = assembleCorpus({
    projectDocs: readDocs(projectsDir),
    postDocs: readDocs(postsDir),
    aboutAstroSource: readFileSync(
      resolve(repoRoot, "src/pages/about.astro"),
      "utf8",
    ),
    statusFacts: STATUS,
  });
  const allText = chunks.map((c) => c.text).join(" ");

  it("never surfaces text unique to public/llms.txt", () => {
    const llmsTxt = readFileSync(resolve(repoRoot, "public/llms.txt"), "utf8");
    // A sentence that only exists in llms.txt, not in any real page's prose.
    expect(llmsTxt).toContain("Open to AI, data, and product roles.");
    expect(allText).not.toContain("Open to AI, data, and product roles.");
  });

  it("never surfaces text unique to a src/content/for/ tailored page", () => {
    const forPage = readFileSync(
      resolve(repoRoot, "src/content/for/demo/index.yaml"),
      "utf8",
    );
    expect(forPage).toContain("A demonstration of a tailored page");
    expect(allText).not.toContain("A demonstration of a tailored page");
  });

  it("includes a real chunk for the lead-scoring case study at its real /work route", () => {
    const chunk = chunks.find(
      (c) => c.route === "/work/lead-scoring" && c.sourceKind === "project",
    );
    expect(chunk).toBeDefined();
    expect(chunk?.text).toContain("decile model");
  });
});
