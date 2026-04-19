import { expect, test } from "@playwright/test";

const routes = [
  {
    path: "/",
    title: "korabeland.com — trailhead",
    descriptionFragment: "builder, operator, writer",
    ogType: "website",
    hasOgImage: true,
    noindex: false,
  },
  {
    path: "/colophon",
    title: "korabeland.com — colophon",
    descriptionFragment: "How korabeland.com was built",
    ogType: "website",
    hasOgImage: false,
    noindex: false,
  },
  {
    path: "/off-trail",
    title: "korabeland.com — off-trail",
    descriptionFragment: "This path hasn't been mapped yet",
    ogType: "website",
    hasOgImage: false,
    noindex: true,
  },
] as const;

for (const route of routes) {
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

    // JSON-LD present and valid
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toHaveCount(1);
    const jsonLdText = await jsonLdScript.textContent();
    expect(() => JSON.parse(jsonLdText ?? "")).not.toThrow();
    const jsonLd = JSON.parse(jsonLdText ?? "{}");
    expect(jsonLd["@context"]).toBe("https://schema.org");

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
