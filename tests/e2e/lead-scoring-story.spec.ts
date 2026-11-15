import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

// The flagship explorable case study. Each test states what a reader can do
// with a figure, by keyboard, at phone and desktop width, in both shifts, and
// with scripts off. Axe coverage for the route comes from the collection
// enumeration in tests/visual/accessibility.test.ts (both shifts).

const STORY = "/work/call-tiers-lead-scoring";
const SOURCES = ["intent-tiers", "call-tier-discipline", "lead-scoring"].map(
  (slug) =>
    readFileSync(
      resolve(process.cwd(), `src/content/projects/${slug}/index.mdoc`),
      "utf8",
    ),
);

function figures(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,]\d+)?\s?(?:%|×|k\b)?/g)].map((m) =>
    m[0].replace(/\s/g, ""),
  );
}

const isCount = (token: string) => /^0?\d$|^10$/.test(token);
const DERIVED = new Set(["1×"]);

const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const SHIFTS = ["night", "day"] as const;

const shiftState = (shift: (typeof SHIFTS)[number]) => ({
  cookies: [],
  origins: [
    { origin: ORIGIN, localStorage: [{ name: "korab-shift", value: shift }] },
  ],
});

async function openStory(page: Page) {
  await page.goto(STORY);
  await page.locator("main#main").waitFor({ state: "visible" });
}

test("rendered copy and every interactive state use published figures", async ({
  page,
}) => {
  await openStory(page);
  const renderedStates = [await page.locator("main").innerText()];

  const effort = page.locator("#figure-call-effort");
  await effort.getByRole("radio", { name: /After/ }).check();
  renderedStates.push(await page.locator("main").innerText());

  const slider = page.locator("#figure-cutoff input[type=range]");
  await slider.focus();
  await page.keyboard.press("Home");
  for (let kept = 0; kept <= 10; kept += 1) {
    if (kept > 0) await page.keyboard.press("ArrowRight");
    renderedStates.push(await page.locator("main").innerText());
  }

  const sourceFigures = new Set(SOURCES.flatMap(figures));
  const untraced = renderedStates
    .flatMap(figures)
    .filter(
      (token) =>
        !isCount(token) && !DERIVED.has(token) && !sourceFigures.has(token),
    );
  expect(untraced).toEqual([]);
  for (const text of renderedStates) {
    expect(text).not.toMatch(/[—–]|\S - \S/);
  }
});

for (const shift of SHIFTS) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name}, ${shift} shift`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        storageState: shiftState(shift),
      });

      test("the page fits the viewport and labels what is illustrative", async ({
        page,
      }) => {
        await openStory(page);
        await expect(page.locator("html")).toHaveAttribute("data-time", shift);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);

        // Figures 01 and 03 draw shapes the source pages do not publish;
        // figure 02 is measured throughout.
        const chip = (id: string) => page.locator(`#${id} .xf-chip`);
        await expect(chip("figure-tier-matrix")).toHaveText("Illustrative");
        await expect(chip("figure-cutoff")).toHaveText("Illustrative");
        await expect(chip("figure-call-effort")).toHaveCount(0);
      });

      test("answering both questions by keyboard sorts the lead into a tier", async ({
        page,
      }) => {
        await openStory(page);
        const figure = page.locator("#figure-tier-matrix");
        const result = figure.locator("[data-pm-say]");
        await expect(result).toContainText("Tier 2. Call next.");

        await figure.getByRole("radio", { name: "This year" }).focus();
        await page.keyboard.press("ArrowUp");
        await expect(
          figure.getByRole("radio", { name: "As soon as possible" }),
        ).toBeChecked();
        await expect(result).toContainText("Tier 1. Call first.");

        await figure.getByRole("radio", { name: "Advance my career" }).focus();
        await page.keyboard.press("ArrowDown");
        await expect(result).toContainText(
          "As soon as possible + Personal interest",
        );
        await expect(result).toContainText("Tier 2. Call next.");
        await expect(figure.locator(".pm-cell[data-on]")).toHaveCount(1);
      });

      test("switching to after shows the bottom tier's effort fall to 0.7%", async ({
        page,
      }) => {
        await openStory(page);
        const figure = page.locator("#figure-call-effort");
        // Both states' values are in the markup; only the checked state's
        // is displayed, so assert on the visible one.
        const share = figure.locator(
          ".ss-legend-row[data-focus] .ss-legend-value span:visible",
        );
        await expect(share).toHaveText("27.8%");

        const before = figure.getByRole("radio", { name: /Before/ });
        await before.focus();
        await page.keyboard.press("ArrowRight");
        await expect(
          figure.getByRole("radio", { name: /After/ }),
        ).toBeChecked();
        await expect(share).toHaveText("0.7%");
        await expect(figure.locator(".ss-verdict:visible")).toContainText(
          "conversion held",
        );
        // The published ratio stays put under either state.
        await expect(figure.locator(".rp")).toContainText("8×");
      });

      test("moving the cutoff by keyboard walks from the tiers' cut to half", async ({
        page,
      }) => {
        await openStory(page);
        const figure = page.locator("#figure-cutoff");
        const slider = figure.getByRole("slider");
        const readout = figure.locator(".cd-read");
        await expect(readout).toContainText("bottom 5 deciles of 10");
        await expect(readout).toContainText("Half.");

        await slider.focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await expect(readout).toContainText("bottom 3 deciles of 10");
        await expect(readout).toContainText("roughly 27% of call effort");
        await expect(slider).toHaveAttribute(
          "aria-valuetext",
          "Cutoff: bottom 3 deciles of 10 not called.",
        );
        await expect(figure.locator(".cd-bar[data-cut]")).toHaveCount(3);

        await page.keyboard.press("End");
        await expect(readout).toContainText("all 10 deciles called");
        await expect(readout).toContainText("This is coverage.");
      });

      test("the controls a reader touches are at least 44px tall", async ({
        page,
      }) => {
        await openStory(page);
        for (const selector of [
          "#figure-tier-matrix .pm-opt",
          "#figure-call-effort .ss-state",
          "#figure-cutoff .cd-control input",
          ".story-rail a",
        ]) {
          for (const target of await page.locator(selector).all()) {
            const box = await target.boundingBox();
            expect(box?.height, selector).toBeGreaterThanOrEqual(44);
          }
        }
      });
    });
  }
}

test.describe("with scripts off", () => {
  test.use({ javaScriptEnabled: false });

  test("each figure still carries its point", async ({ page }) => {
    await page.goto(STORY);

    // 01: the whole matrix is a real table; the script-only question groups
    // and readout stay out of the way.
    const matrix = page.locator("#figure-tier-matrix");
    await expect(matrix.locator("table .pm-cell")).toHaveCount(12);
    await expect(matrix.getByRole("rowheader")).toHaveCount(4);
    await expect(matrix.locator("[data-pm-controls]")).toBeHidden();
    await expect(matrix.locator(".pm-legend")).toContainText("Call first");

    // 02: the switch is CSS only, so it still works.
    const effort = page.locator("#figure-call-effort");
    await effort.getByRole("radio", { name: /After/ }).check();
    await expect(
      effort.locator(
        ".ss-legend-row[data-focus] .ss-legend-value span:visible",
      ),
    ).toHaveText("0.7%");

    // 03: the resolved starting state, with no dead control.
    const cutoff = page.locator("#figure-cutoff");
    await expect(cutoff.locator(".cd-read")).toContainText("Half.");
    await expect(cutoff.getByRole("slider")).toHaveCount(0);

    // The prose around the figures is all there.
    await expect(
      page.getByRole("heading", { name: "What is proven, and what is not" }),
    ).toBeVisible();
  });
});

test.describe("reaching the story", () => {
  test("the chapter rail jumps to a chapter", async ({ page }) => {
    await openStory(page);
    await page.locator(".story-rail a").nth(2).click();
    await expect(page).toHaveURL(/#chapter-3$/);
    await expect(
      page.getByRole("heading", { name: "Chapter 3: a score for every lead" }),
    ).toBeInViewport();
  });

  test("the work listing features it, and keeps the three source pages", async ({
    page,
  }) => {
    await page.goto("/work");
    const featured = page.locator(".fs");
    await expect(featured).toContainText("27.8% → 0.7%");

    for (const slug of [
      "intent-tiers",
      "call-tier-discipline",
      "lead-scoring",
    ]) {
      await expect(
        page.locator(`.ledger a[href="/work/${slug}"]`),
      ).toBeVisible();
    }

    // One tab stop for the whole block: the title link.
    await expect(featured.getByRole("link")).toHaveCount(1);
    await featured.getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`${STORY}$`));
  });
});
