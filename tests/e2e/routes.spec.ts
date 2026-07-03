import { expect, test } from "@playwright/test";

// /404 — unknown route serves OffTrail component with HTTP 404
test("/nonexistent route returns 404 with OffTrail component", async ({
  page,
}) => {
  const response = await page.goto("/this-path-does-not-exist-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.locator(".off-trail")).toBeVisible();
  await expect(page.locator("#off-trail-title")).toHaveText("no signal");
});

// / — home console renders the hero, outcome ledger, recent notes, and close.
test("/ renders the operator's console home", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".hero-eyebrow")).toContainText("korab eland");
  await expect(page.locator("h1#hero-heading")).toContainText("ship");
  await expect(page.locator("#ledger-heading")).toContainText("outcome ledger");
  await expect(page.locator(".ledger-row")).not.toHaveCount(0);
  await expect(page.locator("#close-heading")).toContainText(
    "the short version",
  );
});

// /work — case-study index renders the ledger with real project rows.
test("/work renders the case-study index", async ({ page }) => {
  const response = await page.goto("/work");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".work-eyebrow")).toContainText(
    "work · case studies",
  );
  await expect(page.locator('a[href="/work/lead-scoring"]')).toBeVisible();
  await expect(page.locator('a[href="/work/ai-sms-pilot"]')).toBeVisible();
});

// /work/lead-scoring — case-study detail renders title, fact strip, and body.
test("/work/lead-scoring renders the case study detail", async ({ page }) => {
  const response = await page.goto("/work/lead-scoring");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1.head-title")).toContainText("Lead scoring");
  await expect(page.locator(".chip")).toBeVisible();
});

// /work/ai-sms-pilot — second case study, same layout.
test("/work/ai-sms-pilot renders the case study detail", async ({ page }) => {
  const response = await page.goto("/work/ai-sms-pilot");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1.head-title")).toContainText(
    "AI SMS engagement",
  );
});

// /about — career narrative page.
test("/about renders the about page", async ({ page }) => {
  const response = await page.goto("/about");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1.about-title")).toContainText(
    "Turning ambiguous problems into systems",
  );
});

// /notes — field notes index renders the eyebrow, title, and at least the
// hello-world row.
test("/notes renders the field notes index", async ({ page }) => {
  const response = await page.goto("/notes");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".notes-head .eyebrow")).toContainText(
    "field notes",
  );
  await expect(page.locator("h1.title")).toContainText("Field notes");
  await expect(page.locator(`a[href="/notes/hello-world"]`)).toBeVisible();
});

// /notes/hello-world — reading-room page renders the post title, left-rail
// sidebar, and the body prose container.
test("/notes/hello-world renders in the reading room", async ({ page }) => {
  const response = await page.goto("/notes/hello-world");
  expect(response?.status()).toBe(200);
  await expect(page.locator("article.reading-room h1.title")).toContainText(
    "Hello",
  );
  await expect(page.locator(".post-body")).toBeVisible();
});

// /colophon — build log + tools.
test("/colophon renders the colophon page", async ({ page }) => {
  const response = await page.goto("/colophon");
  expect(response?.status()).toBe(200);
  await expect(page.locator("article.colophon h1")).toContainText("Colophon");
});

// /projects and /projects/[slug] redirect to their /work equivalents.
test("/projects redirects to /work", async ({ page }) => {
  const response = await page.goto("/projects");
  expect(response?.status()).toBe(200); // after following the redirect
  expect(new URL(page.url()).pathname).toBe("/work");
});

test("/projects/lead-scoring redirects to /work/lead-scoring", async ({
  page,
}) => {
  const response = await page.goto("/projects/lead-scoring");
  expect(response?.status()).toBe(200); // after following the redirect
  expect(new URL(page.url()).pathname).toBe("/work/lead-scoring");
});

// /off-trail?from= label variants — only known destinations (`notes`,
// `work`) render a subline; anything else falls back to the generic copy.
const FROM_CASES = [
  { slug: "notes", label: "field notes: not live yet" },
  { slug: "work", label: "case studies: not live yet" },
] as const;

for (const { slug, label } of FROM_CASES) {
  test(`/off-trail?from=${slug} shows correct destination label`, async ({
    page,
  }) => {
    await page.goto(`/off-trail?from=${slug}`);
    await expect(page.locator(".subline")).toHaveText(label);
  });
}

test("/off-trail with an unknown from= value falls back to generic copy", async ({
  page,
}) => {
  await page.goto("/off-trail?from=work-with-me");
  await expect(page.locator(".subline")).toHaveCount(0);
  await expect(page.locator(".dek")).toContainText("This page does not exist");
});

// Chrome — availability line renders and nav active state works.
test("chrome renders the availability line", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".avail")).toContainText(
    "open to ai · data · product roles",
  );
  await expect(page.locator(".avail-dot")).toBeVisible();
});

const NAV_ACTIVE_CASES = [
  { path: "/work", href: "/work" },
  { path: "/notes", href: "/notes" },
  { path: "/about", href: "/about" },
  { path: "/colophon", href: "/colophon" },
] as const;

for (const { path, href } of NAV_ACTIVE_CASES) {
  test(`nav active state: ${path}`, async ({ page }) => {
    await page.goto(path);
    const activeLink = page.locator(`.chrome-nav a[href="${href}"]`);
    await expect(activeLink).toHaveClass(/is-active/);
    await expect(activeLink).toHaveAttribute("aria-current", "page");
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
