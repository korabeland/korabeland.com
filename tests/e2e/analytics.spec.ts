import { expect, test } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

const browserOrigin = "http://korabeland.com";
const collectorPath = "/_vercel/insights/script.js";

test("public pageviews keep secrets out of collector request headers", async ({
  page,
}) => {
  const collectorHeaders: Record<string, string>[] = [];
  let scriptLoads = 0;
  let pageviews = 0;

  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === collectorPath) {
      scriptLoads += 1;
      collectorHeaders.push(route.request().headers());
      await route.fulfill({
        contentType: "application/javascript",
        body: `fetch("/_vercel/insights/view", { method: "POST", body: "pageview" });`,
      });
      return;
    }
    if (requestUrl.pathname === "/_vercel/insights/view") {
      pageviews += 1;
      collectorHeaders.push(route.request().headers());
      await route.fulfill({ status: 200, body: "" });
      return;
    }

    const response = await route.fetch({
      url: `${ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
    });
    await route.fulfill({ response });
  });

  await page.goto(`${browserOrigin}/about?token=SECRET#private-fragment`);
  await expect(
    page.getByRole("heading", { name: /about/i }).first(),
  ).toBeVisible();
  await expect.poll(() => pageviews).toBe(1);
  expect(scriptLoads).toBe(1);
  expect(collectorHeaders).toHaveLength(2);
  for (const headers of collectorHeaders) {
    expect(headers.referer).toBe(`${browserOrigin}/`);
    expect(JSON.stringify(headers)).not.toContain("SECRET");
    expect(JSON.stringify(headers)).not.toContain("private-fragment");
  }
});

test("tailored pages never load the analytics collector", async ({ page }) => {
  let scriptLoads = 0;
  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === collectorPath) {
      scriptLoads += 1;
      await route.fulfill({ status: 200, body: "" });
      return;
    }
    const response = await route.fetch({
      url: `${ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
    });
    await route.fulfill({ response });
  });

  await page.goto(`${browserOrigin}/for/demo?token=SECRET`);
  await expect(page.getByText("prepared for", { exact: false })).toBeVisible();
  expect(scriptLoads).toBe(0);
});

test("navigation still works when the analytics collector is blocked", async ({
  page,
}) => {
  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === collectorPath) {
      await route.abort();
      return;
    }
    const response = await route.fetch({
      url: `${ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
    });
    await route.fulfill({ response });
  });

  await page.goto(`${browserOrigin}/about`);
  await expect(
    page.getByRole("heading", { name: /about/i }).first(),
  ).toBeVisible();
});
