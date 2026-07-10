import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
// Relative import (not "@/") to match tests/lib/collection-routes.ts's
// convention — Playwright specs have no path-alias config, only Vitest does.
import { listProjects } from "../../src/lib/projects";

// Coverage for the hero-delivery fix: ReadingRoom/CaseStudy used to ship the
// raw Keystatic `public/` source (multi-MB PNG) as a bare <img>. They now
// render a <picture> sourced from scripts/gen-hero-variants.ts's AVIF/WebP/
// PNG-fallback tiers, generated ahead of build/dev by the predev/prebuild
// hooks. If these assertions fail because the variant files are missing
// entirely (a fresh checkout that skipped predev, or a generator bug), the
// symptom is a 404 for every `*.gen.*` request — see the GEN_HINT message
// threaded through every assertion below.
const GEN_HINT =
  "Hero variant files appear to be missing or stale — run `pnpm exec tsx scripts/gen-hero-variants.ts` (see scripts/gen-hero-variants.ts) and retry.";

const MAX_HERO_BYTES = 200 * 1024;

// Each hero's true dimensions come from its generator-emitted meta file, so
// the aspect assertion tracks whatever source the content actually uses
// instead of pinning one fixture's ratio onto every hero.
function sourceAspectRatio(metaRelPath: string): number {
  const meta = JSON.parse(
    readFileSync(resolve(__dirname, "../..", metaRelPath), "utf8"),
  ) as { width: number; height: number };
  return meta.width / meta.height;
}

/**
 * Navigates to `route`, waits for the actual hero image request the browser
 * chooses to download (AVIF or WebP, decided by content negotiation in
 * <picture>), and asserts it's under budget and in a next-gen format.
 * Returns the <img> locator so callers can additionally assert on its
 * width/height attributes.
 */
async function assertHeroDelivery(
  page: Page,
  route: string,
  heroBasename: string,
) {
  const heroResponsePromise = page
    .waitForResponse(
      (res) =>
        res.url().includes(`${heroBasename}.gen.`) &&
        !res.url().endsWith(".json"),
      { timeout: 10_000 },
    )
    .catch(() => null);

  const pageResponse = await page.goto(route);
  expect(pageResponse?.status(), GEN_HINT).toBe(200);

  const heroResponse = await heroResponsePromise;
  expect(
    heroResponse,
    `No hero image request was observed for ${route}. ${GEN_HINT}`,
  ).not.toBeNull();
  if (!heroResponse) return;

  expect(
    heroResponse.ok(),
    `Hero image request to ${heroResponse.url()} did not succeed (status ${heroResponse.status()}). ${GEN_HINT}`,
  ).toBe(true);

  const contentType = heroResponse.headers()["content-type"] ?? "";
  expect(
    contentType === "image/avif" || contentType === "image/webp",
    `Expected the delivered hero to be AVIF or WebP, got content-type "${contentType}" for ${heroResponse.url()}. ${GEN_HINT}`,
  ).toBe(true);

  const body = await heroResponse.body();
  expect(
    body.length,
    `Hero image at ${heroResponse.url()} is ${(body.length / 1024).toFixed(1)}KB — over the 200KB budget. ${GEN_HINT}`,
  ).toBeLessThanOrEqual(MAX_HERO_BYTES);
}

async function assertHeroDimensions(
  page: Page,
  selector: string,
  expectedAspectRatio: number,
) {
  const img = page.locator(selector);
  await expect(img, GEN_HINT).toBeVisible();

  const widthAttr = await img.getAttribute("width");
  const heightAttr = await img.getAttribute("height");
  expect(
    widthAttr,
    `<img> is missing a width attribute. ${GEN_HINT}`,
  ).toBeTruthy();
  expect(
    heightAttr,
    `<img> is missing a height attribute. ${GEN_HINT}`,
  ).toBeTruthy();

  const width = Number(widthAttr);
  const height = Number(heightAttr);
  expect(
    Number.isInteger(width) && width > 0,
    `width="${widthAttr}" is not a positive integer.`,
  ).toBe(true);
  expect(
    Number.isInteger(height) && height > 0,
    `height="${heightAttr}" is not a positive integer.`,
  ).toBe(true);

  expect(width / height).toBeCloseTo(expectedAspectRatio, 2);
}

const HERO_POST_ROUTE = "/notes/system-designer-personal-os";
const HERO_POST_BASENAME = "personal-os-hero";

test.describe("post hero delivery — /notes/system-designer-personal-os", () => {
  test("at 375×812, ships an AVIF/WebP hero under the 200KB budget", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await assertHeroDelivery(page, HERO_POST_ROUTE, HERO_POST_BASENAME);
  });

  test("at 1280×800, ships an AVIF/WebP hero under the 200KB budget", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await assertHeroDelivery(page, HERO_POST_ROUTE, HERO_POST_BASENAME);
  });

  test("rendered <img> has integer width/height matching the source aspect ratio", async ({
    page,
  }) => {
    await page.goto(HERO_POST_ROUTE);
    await assertHeroDimensions(
      page,
      "figure.hero img",
      sourceAspectRatio(`public/notes/${HERO_POST_BASENAME}.gen.meta.json`),
    );
  });
});

// hello-world (src/content/posts/hello-world) has no heroImage set — the
// component must skip the <figure class="hero"> entirely rather than
// rendering a broken/empty <picture>.
test("post without a hero renders no figure.hero", async ({ page }) => {
  await page.goto("/notes/hello-world");
  await expect(page.locator("figure.hero")).toHaveCount(0);
});

test.describe("case study hero delivery", () => {
  test("project hero contract, if any project declares one", async ({
    page,
  }) => {
    const projects = await listProjects();
    const heroProject = projects.find((p) => p.heroImage);

    test.skip(
      !heroProject,
      "No project in the projects collection currently declares a heroImage " +
        "(src/lib/projects.ts ProjectSummary.heroImage) — skipping until one does.",
    );
    if (!heroProject || !heroProject.heroImage) return;

    const route = `/work/${heroProject.slug}`;
    const basename = heroProject.heroImage.replace(/\.[^./]+$/, "");

    await assertHeroDelivery(page, route, basename);
    // Project heroes live under public/work (keystatic.config.ts heroImage
    // directory) — each carries its own generator-emitted dimensions.
    await assertHeroDimensions(
      page,
      "img.head-image",
      sourceAspectRatio(`public/work/${basename}.gen.meta.json`),
    );
  });
});

// Home preloads its mobile LCP element (the night portrait) from the head.
// The preload's imagesrcset is hand-mirrored in src/pages/index.astro from
// the markup Portrait renders — this pins the two together so a variant
// rename or width change can't silently turn the preload into a no-op
// double-download.
test("home LCP preload mirrors the night portrait's AVIF srcset", async ({
  page,
}) => {
  await page.goto("/");
  const preload = page.locator(
    'link[rel="preload"][as="image"][type="image/avif"]',
  );
  await expect(preload).toHaveCount(1);
  const preloadSrcset = await preload.getAttribute("imagesrcset");
  const renderedSrcset = await page
    .locator('picture.portrait-night source[type="image/avif"]')
    .getAttribute("srcset");
  expect(preloadSrcset).toBe(renderedSrcset);
  expect(await preload.getAttribute("imagesizes")).toBe(
    await page
      .locator('picture.portrait-night source[type="image/avif"]')
      .getAttribute("sizes"),
  );
});
