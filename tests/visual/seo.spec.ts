import { expect, test } from "@playwright/test";

const routes = [
  {
    path: "/",
    title: "korab eland · operator · builds with ai",
    descriptionFragment: "ambiguous problems into systems",
    ogType: "website",
    hasOgImage: true,
    noindex: false,
  },
  {
    path: "/work",
    title: "work · case studies · korab eland",
    descriptionFragment: "Case studies from the field",
    ogType: "website",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/work/lead-scoring",
    title:
      "Lead scoring: fixed tiers to a decile model · case study · korab eland",
    descriptionFragment: "Stopping hundreds of low-value calls",
    ogType: "article",
    hasOgImage: false,
    noindex: false,
    hasJsonLd: true,
  },
  {
    path: "/about",
    title: "about · korab eland",
    descriptionFragment: "13 years across marketing, CX and operations",
    ogType: "website",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/colophon",
    title: "korabeland.com: colophon",
    descriptionFragment: "How korabeland.com was built",
    ogType: "website",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/notes",
    title: "field notes: korabeland.com",
    descriptionFragment: "Field notes on building",
    ogType: "website",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/notes/hello-world",
    title: "Hello World: field notes",
    descriptionFragment: "first post",
    ogType: "article",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/off-trail",
    title: "korabeland.com: page not found",
    descriptionFragment: "This page does not exist",
    ogType: "website",
    hasOgImage: false,
    noindex: true,
  },
  {
    path: "/for/demo",
    title: "For Demo Company · korab eland",
    descriptionFragment: "prepared for Demo Company",
    ogType: "website",
    hasOgImage: false,
    noindex: true,
    hasJsonLd: false,
  },
] as const;

for (const route of routes) {
  const hasJsonLd = "hasJsonLd" in route ? route.hasJsonLd : true;
  test(`SEO head: ${route.path}`, async ({ page }) => {
    await page.goto(route.path);

    // <title>
    await expect(page).toHaveTitle(route.title);

    // meta description
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute(
      "content",
      new RegExp(route.descriptionFragment),
    );

    // Open Graph
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      route.title,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", new RegExp(route.descriptionFragment));
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      route.ogType,
    );
    // og:url reflects the current request URL (localhost in dev, production in prod)
    const ogUrl = await page
      .locator('meta[property="og:url"]')
      .getAttribute("content");
    expect(ogUrl).toBeTruthy();
    const ogUrlObj = new URL(ogUrl ?? "");
    expect(ogUrlObj.pathname).toBe(route.path);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "korabeland.com",
    );

    // OG image (home only)
    if (route.hasOgImage) {
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /og\.png/,
      );
    } else {
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    }

    // Twitter Card — summary_large_image when og:image present, else summary
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      route.hasOgImage ? "summary_large_image" : "summary",
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      route.title,
    );
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute("content", new RegExp(route.descriptionFragment));

    // JSON-LD present and valid (all routes except the known gap above)
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    if (hasJsonLd) {
      await expect(jsonLdScript).toHaveCount(1);
      const jsonLdText = await jsonLdScript.textContent();
      expect(() => JSON.parse(jsonLdText ?? "")).not.toThrow();
      const jsonLd = JSON.parse(jsonLdText ?? "{}");
      expect(jsonLd["@context"]).toBe("https://schema.org");
    } else {
      await expect(jsonLdScript).toHaveCount(0);
    }

    // noindex guard
    if (route.noindex) {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
    } else {
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    }
  });
}

// Favicon + iOS touch icon are emitted once from BaseLayout, so they appear on
// every route — asserting on "/" proves the shared shell wiring. GETting each
// href confirms the portrait-derived PNGs were actually emitted, not just that
// the tags were written.
test("favicon and apple-touch-icon are present and resolve", async ({
  page,
}) => {
  await page.goto("/");

  // Tab favicon: PNG link whose generated asset resolves.
  const favicon = page.locator('link[rel~="icon"]');
  await expect(favicon).toHaveCount(1);
  await expect(favicon).toHaveAttribute("type", "image/png");
  const faviconHref = await favicon.getAttribute("href");
  expect(faviconHref).toBeTruthy();
  const faviconResp = await page.request.get(faviconHref ?? "");
  expect(faviconResp.status()).toBe(200);
  expect(faviconResp.headers()["content-type"]).toContain("image/png");

  // iOS home-screen / bookmark icon.
  const touchIcon = page.locator('link[rel="apple-touch-icon"]');
  await expect(touchIcon).toHaveCount(1);
  const touchHref = await touchIcon.getAttribute("href");
  expect(touchHref).toBeTruthy();
  const touchResp = await page.request.get(touchHref ?? "");
  expect(touchResp.status()).toBe(200);
});

// Home embeds a JSON-LD @graph containing a schema.org Person node for
// Korab — the canonical identity anchor other pages' JSON-LD references via
// @id / mainEntity.
test("home JSON-LD graph includes a Person node", async ({ page }) => {
  await page.goto("/");
  const jsonLdText = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const jsonLd = JSON.parse(jsonLdText ?? "{}");
  expect(jsonLd["@graph"]).toBeTruthy();
  const personNode = (jsonLd["@graph"] as Array<Record<string, unknown>>).find(
    (node) => node["@type"] === "Person",
  );
  expect(personNode).toBeTruthy();
  expect(personNode?.name).toBe("Korab Eland");
  expect(personNode?.["@id"]).toBe("https://korabeland.com/#person");
});

// /about references the Person node via mainEntity rather than duplicating it.
test("/about JSON-LD references the Person node via mainEntity", async ({
  page,
}) => {
  await page.goto("/about");
  const jsonLdText = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  const jsonLd = JSON.parse(jsonLdText ?? "{}");
  expect(jsonLd["@type"]).toBe("ProfilePage");
  expect(jsonLd.mainEntity?.["@id"]).toBe("https://korabeland.com/#person");
});

// Tailored /for/ pages are unlisted: noindex (asserted per-route above) AND
// absent from the sitemap (AE5). Build-time output, so this is meaningful
// post-build / in CI; it skips under the dev server.
test("sitemap excludes /for/ tailored pages", async ({ request }) => {
  const indexResp = await request.get("/sitemap-index.xml");
  if (indexResp.status() !== 200) {
    test.skip(true, "Sitemap not available in dev mode (build-time only)");
    return;
  }
  const sitemapResp = await request.get("/sitemap-0.xml");
  expect(sitemapResp.status()).toBe(200);
  const xml = await sitemapResp.text();
  expect(xml).not.toContain("/for/");
});
