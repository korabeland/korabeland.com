import { expect, test } from "@playwright/test";

// Coverage for two recently-shipped surfaces: the colophon's featured "latest
// commit" (PR #13) and the hero social icon row (PR #14). Both are data- or
// content-driven and had no assertion beyond a page <h1>.

test("colophon features a latest commit with a valid datetime and earlier rows", async ({
  page,
}) => {
  await page.goto("/colophon");

  const featured = page.locator(".commit-featured");
  await expect(featured).toHaveCount(1);

  // The featured commit must carry a machine-readable, parseable timestamp —
  // this is what the relative-time copy and the P0 trail-register fix feed.
  const datetime = await featured
    .locator("time.commit-when")
    .getAttribute("datetime");
  expect(datetime).toBeTruthy();
  expect(Number.isNaN(Date.parse(datetime ?? ""))).toBe(false);

  await expect(featured.locator(".commit-featured-subject")).not.toBeEmpty();

  // The "earlier commits" list renders real rows, not an empty shell.
  expect(
    await page.locator("ol.commit-list li.commit").count(),
  ).toBeGreaterThan(0);
});

test("hero social row links to X, LinkedIn, GitHub, and email with aria-labels", async ({
  page,
}) => {
  await page.goto("/");

  const links = page.locator(".hero-social-link");
  await expect(links).toHaveCount(4);

  const expected: Array<[string, RegExp]> = [
    ["https://x.com/korabeland", /X$/],
    ["https://www.linkedin.com/in/korabeland", /LinkedIn$/],
    ["https://github.com/korabeland", /GitHub$/],
    ["mailto:hello@korabeland.com", /Email/],
  ];
  for (const [href, label] of expected) {
    const link = page.locator(`.hero-social-link[href="${href}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("aria-label", label);
  }
});
