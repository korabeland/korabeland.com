import { expect, test } from "@playwright/test";

// /404 — unknown route serves OffTrail component with HTTP 404
test("/nonexistent route returns 404 with OffTrail component", async ({
  page,
}) => {
  const response = await page.goto("/this-path-does-not-exist-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.locator(".off-trail")).toBeVisible();
  await expect(page.locator("#off-trail-title")).toHaveText("off-trail");
});

// /off-trail?from= label variants (SSR — skip in static-preview CI)
const FROM_CASES = [
  { slug: "notes", label: "field notes — not yet in the system" },
  { slug: "projects", label: "projects — not yet in the system" },
  { slug: "work-with-me", label: "work with me — not yet in the system" },
] as const;

for (const { slug, label } of FROM_CASES) {
  test(`/off-trail?from=${slug} shows correct destination label`, async ({
    page,
  }) => {
    test.skip(!!process.env.CI, "SSR route: unavailable in static-preview CI");
    await page.goto(`/off-trail?from=${slug}`);
    await expect(page.locator(".subline")).toHaveText(label);
  });
}

// robots.txt must block /dev/ and /keystatic
test("robots.txt disallows /dev/ and /keystatic", async ({ request }) => {
  const resp = await request.get("/robots.txt");
  expect(resp.status()).toBe(200);
  const text = await resp.text();
  expect(text).toContain("Disallow: /dev/");
  expect(text).toContain("Disallow: /keystatic");
});

// sitemap must not expose /dev/ paths (build-time output — available in CI/after build)
test("sitemap-0.xml contains no /dev/ URLs", async ({ request }) => {
  const indexResp = await request.get("/sitemap-index.xml");
  if (indexResp.status() !== 200) {
    test.skip(true, "Sitemap not available in dev mode (build-time only)");
    return;
  }
  const sitemapResp = await request.get("/sitemap-0.xml");
  expect(sitemapResp.status()).toBe(200);
  const xml = await sitemapResp.text();
  expect(xml).not.toContain("/dev/");
});
