import { expect, test } from "@playwright/test";
import { postRoutesSync, projectRoutesSync } from "../lib/collection-routes";

// Every published project/post route, derived from the same content the site
// reads — so a new case study or post gets at least generic coverage below
// without a spec edit. lead-scoring, ai-sms-pilot, and hello-world keep their
// route-specific assertions further down and are excluded from the generic
// loops to avoid double-testing the same route. Sync (not the async
// reader-based helper): Playwright transforms spec files to CJS, where a
// top-level `await` throws at collect time.
const allProjectRoutes = projectRoutesSync().map((entry) => entry.path);
const allPostRoutes = postRoutesSync().map((entry) => entry.path);
const SPOT_CHECKED_PROJECT_ROUTES = new Set([
  "/work/lead-scoring",
  "/work/ai-sms-pilot",
]);
const SPOT_CHECKED_POST_ROUTES = new Set(["/notes/hello-world"]);

// /404 — unknown route serves OffTrail component with HTTP 404
test("/nonexistent route returns 404 with OffTrail component", async ({
  page,
}) => {
  const response = await page.goto("/this-path-does-not-exist-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.locator(".off-trail")).toBeVisible();
  await expect(page.locator("#off-trail-title")).toHaveText("no signal");
});

// / — home console renders the hero, outcome ledger, shift-log band, recent
// notes, and close.
test("/ renders the operator's console home", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".hero-eyebrow")).toContainText("korab eland");
  await expect(page.locator("h1#hero-heading")).toContainText("ship");
  await expect(page.locator("#ledger-heading")).toContainText("outcome ledger");
  // U8 curation: home features exactly three case studies; the full index
  // stays one click away via the ledger's more-link.
  await expect(page.locator(".ledger-row")).toHaveCount(3);
  await expect(page.locator('a.section-more[href="/work"]')).toBeVisible();
  await expect(page.locator("#close-heading")).toContainText(
    "the short version",
  );
});

// U4 — the hero headline rotates its subject only with motion. Playwright
// emulates prefers-reduced-motion globally, so the default subject must stay
// put (AE2: static default under reduced motion / no JS).
test("hero headline stays on the default subject under reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const word = page.locator(".hero-ship-word");
  await expect(word).toHaveText("ship");
  // Wait past one rotation interval; the script must have self-disabled.
  await page.waitForTimeout(3200);
  await expect(word).toHaveText("ship");
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
  // /work stays the FULL index — every published case study gets a row
  // (home curates to three; this page must not).
  await expect(page.locator(".ledger-row")).toHaveCount(
    allProjectRoutes.length,
  );
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

// Generic coverage for every project route not already spot-checked above —
// the floor every case study must clear: it renders, and the case-study
// detail shell (title + at least one fact chip) is present.
for (const route of allProjectRoutes) {
  if (SPOT_CHECKED_PROJECT_ROUTES.has(route)) continue;
  test(`${route} renders the case study detail`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1.head-title")).toBeVisible();
    await expect(page.locator(".chip")).toBeVisible();
  });
}

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

// Generic coverage for every post route not already spot-checked above.
for (const route of allPostRoutes) {
  if (SPOT_CHECKED_POST_ROUTES.has(route)) continue;
  test(`${route} renders in the reading room`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("article.reading-room h1.title")).toBeVisible();
    await expect(page.locator(".post-body")).toBeVisible();
  });
}

// /colophon — build log + tools.
test("/colophon renders the colophon page", async ({ page }) => {
  const response = await page.goto("/colophon");
  expect(response?.status()).toBe(200);
  await expect(page.locator("article.colophon h1")).toContainText("Colophon");
});

// R9 shift-log now lives on the home page as a band: the mono summary line is
// the accessible representation, driven by real seed data (never hardcoded);
// the cell grid is aria-hidden decoration. axe checks for violations but not
// this subtree-exclusion contract, so pin it.
test("/ shift-log exposes a real-data summary and hides the grid", async ({
  page,
}) => {
  await page.goto("/");
  const summary = page.locator(".shiftlog-summary");
  await expect(summary).toBeVisible();
  await expect(summary).toHaveText(
    /\d[\d,]*\s+contributions\s+·\s+busiest week\s+\d+\s+·\s+streak\s+\d+\s+days/,
  );
  await expect(page.locator(".shiftlog-grid")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
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

// Availability signal — status line in the homepage hero readout, quiet
// echo in every footer. The header rail is identical on every page: the
// shift toggle sits to the left of the wordmark (the old logo/badge was
// removed), and the contact CTA anchors the right.
test("home hero renders the availability status line and portrait", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".hero-avail")).toContainText(
    "open to ai · data · product roles",
  );
  await expect(page.locator(".hero-avail .statuschip-dot")).toBeVisible();
  // Portrait swaps with the shift: night (this test's pinned palette) shows
  // the orange variant; the blue day variant is present but hidden until day.
  await expect(page.locator(".hero-portrait .portrait-night")).toBeVisible();
  await expect(page.locator(".hero-portrait .portrait-day")).toBeHidden();
  // Logo/badge removed from the rail; the toggle takes its place, left of the name.
  await expect(page.locator(".chrome-mark, .chrome-badge")).toHaveCount(0);
  await expect(page.locator(".chrome-left .shift-toggle")).toBeVisible();
});

test("footer carries the availability echo; header shows the contact CTA", async ({
  page,
}) => {
  await page.goto("/work");
  await expect(page.locator(".footer-avail")).toContainText("open to roles");
  const cta = page.locator(".chrome-cta");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "mailto:korabeland@gmail.com");
  await expect(page.locator(".chrome-left .shift-toggle")).toBeVisible();
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

// U2 — the experience section is content-gated: with the collection empty it
// must not render on the homepage (no placeholder content ships).
test("homepage omits the experience section while the collection is empty", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#experience-heading")).toHaveCount(0);
});

// U2 — dev-only preview renders ExperienceLedger against fixtures so the section
// markup is covered without committing content. AE1: a testimonial element
// appears only for a role that has one.
test("/dev/experience-preview renders roles, a current chip, and conditional testimonials", async ({
  page,
}) => {
  const response = await page.goto("/dev/experience-preview");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".experience-row")).toHaveCount(2);
  await expect(
    page.locator(".experience-row").first().locator(".statuschip"),
  ).toContainText("current");
  await expect(page.locator(".experience-period").first()).toHaveText(
    "2021–present",
  );
  // AE1: only the role with a testimonial renders a testimonial element.
  await expect(page.locator(".experience-testimonial")).toHaveCount(1);
  await expect(page.getByText("6 · stakeholders")).toBeVisible();
});

// U3 — skills section is content-gated: absent while the singleton is empty.
test("about page omits the skills section while the singleton is empty", async ({
  page,
}) => {
  await page.goto("/about");
  await expect(page.locator("#skills-heading")).toHaveCount(0);
});

// U3 — dev-only preview renders SkillsSection against a fixture.
test("/dev/skills-preview renders categories and certifications", async ({
  page,
}) => {
  const response = await page.goto("/dev/skills-preview");
  expect(response?.status()).toBe(200);
  await expect(page.locator("#skills-heading")).toBeVisible();
  await expect(page.locator(".skills-cat")).not.toHaveCount(0);
  await expect(page.locator(".skills-cert")).not.toHaveCount(0);
  await expect(page.getByText("SQL · Python", { exact: false })).toBeVisible();
});

// U6 — a tailored page renders for a known slug, assembled from the pool with
// case-study exits (AE4), and carries the noindex directive.
test("/for/demo renders the tailored page with its case-study exits", async ({
  page,
}) => {
  const response = await page.goto("/for/demo");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".tailored-eyebrow")).toContainText("Demo Company");
  await expect(page.locator('a[href="/work/lead-scoring"]')).toBeVisible();
  await expect(page.locator('a[href="/work/ai-sms-pilot"]')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

// U6 — an unknown /for/ slug falls through to the SSR 404 (off-trail); the
// stale-link answer after a page is deleted (F3).
test("/for/nonexistent-xyz returns 404 via the off-trail page", async ({
  page,
}) => {
  const response = await page.goto("/for/nonexistent-xyz");
  expect(response?.status()).toBe(404);
  await expect(page.locator(".off-trail")).toBeVisible();
});

// U6 — tailored pages are unlisted: nothing on the site links into /for/.
test("no navigation links point into /for/", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/for/"]')).toHaveCount(0);
});

// robots.txt must block /dev/ and /keystatic
test("robots.txt disallows /dev/ and /keystatic", async ({ request }) => {
  const resp = await request.get("/robots.txt");
  expect(resp.status()).toBe(200);
  const text = await resp.text();
  expect(text).toContain("Disallow: /dev/");
  expect(text).toContain("Disallow: /keystatic");
});

// llms.txt advertises routes to LLM crawlers; every concrete path it names must
// resolve (no 404). Guards against the file drifting back to phantom routes
// (/now, /contact, /resume.json) or naming a page that later gets renamed.
test("llms.txt references only routes that resolve", async ({ request }) => {
  const resp = await request.get("/llms.txt");
  expect(resp.status()).toBe(200);
  const text = await resp.text();
  // Bullet lines like "* /work - ...". Take the path token, skip placeholder
  // patterns ("/work/<slug>") which are illustrative, not literal routes.
  const paths = text
    .split("\n")
    .map((line) => line.match(/^\*\s+(\/\S*)/)?.[1])
    .filter((p): p is string => p !== undefined && !p.includes("<"));
  expect(paths.length).toBeGreaterThan(0);
  for (const path of paths) {
    const routeResp = await request.get(path);
    expect(
      routeResp.status(),
      `llms.txt route ${path} should not 404`,
    ).not.toBe(404);
  }
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
