import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

const browserOrigin = "https://korabeland.com";
const sourceOrigin = "https://source.example.com";
const collectorPrefix = "/_vercel/insights/";
const collectorScript = readFileSync(
  resolve("tests/fixtures/vercel-analytics-collector.js"),
  "utf8",
);

interface CollectorRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

test("the official collector receives filtered page and referrer data", async ({
  browser,
}) => {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  const requests: CollectorRequest[] = [];

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    (window as Window & { initialReferrer?: string }).initialReferrer =
      document.referrer;
  });
  await page.route(`${sourceOrigin}/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: { "Referrer-Policy": "unsafe-url" },
      body: '<a href="https://korabeland.com/about?token=SECRET#private-fragment">Visit</a>',
    });
  });
  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.startsWith(collectorPrefix)) {
      requests.push({
        url: requestUrl.href,
        method: route.request().method(),
        headers: route.request().headers(),
        body: route.request().postData(),
      });
      if (requestUrl.pathname === `${collectorPrefix}script.js`) {
        await route.fulfill({
          contentType: "application/javascript",
          body: collectorScript,
        });
      } else {
        await route.fulfill({ status: 200, body: "" });
      }
      return;
    }

    const response = await route.fetch({
      url: `${ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
    });
    await route.fulfill({ response });
  });

  try {
    await page.goto(`${sourceOrigin}/private?token=SECRET#source-fragment`);
    await page.getByRole("link", { name: "Visit" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Turning ambiguous problems into systems",
      }),
    ).toBeVisible();
    await expect.poll(() => requests.length).toBe(2);

    expect(
      await page.evaluate(
        () => (window as Window & { initialReferrer?: string }).initialReferrer,
      ),
    ).toBe(`${sourceOrigin}/private?token=SECRET`);
    expect(await page.evaluate(() => document.referrer)).toBe(
      `${sourceOrigin}/`,
    );
    expect(requests.map(({ method }) => method)).toEqual(["GET", "POST"]);
    expect(requests.map(({ url }) => url)).toEqual([
      `${browserOrigin}${collectorPrefix}script.js`,
      `${browserOrigin}${collectorPrefix}view`,
    ]);
    expect(requests[0].body).toBeNull();
    expect(requests[1].body).not.toBeNull();

    for (const request of requests) {
      expect(request.headers.referer).toBe(`${browserOrigin}/`);
      expect(JSON.stringify(request)).not.toContain("SECRET");
      expect(JSON.stringify(request)).not.toContain("private-fragment");
      expect(JSON.stringify(request)).not.toContain("source-fragment");
    }

    const pageview = JSON.parse(requests[1].body ?? "{}");
    expect(pageview.o).toBe(`${browserOrigin}/about`);
    expect(pageview.r).toBe(`${sourceOrigin}/`);
    expect(pageview).not.toHaveProperty("userId");
    expect(pageview).not.toHaveProperty("props");
  } finally {
    await page.unrouteAll({ behavior: "wait" });
    await context.close();
  }
});

test("tailored pages never load the analytics collector", async ({ page }) => {
  let scriptLoads = 0;
  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === `${collectorPrefix}script.js`) {
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
  await page.unrouteAll({ behavior: "wait" });
});

test("navigation still works when the analytics collector is blocked", async ({
  page,
}) => {
  let collectorRequested = false;
  let collectorAborted = false;
  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname.startsWith(collectorPrefix)) {
      collectorRequested = true;
      await route.abort();
      collectorAborted = true;
      return;
    }
    const response = await route.fetch({
      url: `${ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
    });
    try {
      await route.fulfill({ response });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("already handled")
      ) {
        throw error;
      }
    }
  });

  await page.goto(`${browserOrigin}/about`);
  await expect(
    page.getByRole("heading", {
      name: "Turning ambiguous problems into systems",
    }),
  ).toBeVisible();
  await expect.poll(() => collectorAborted).toBe(true);
  await page.getByRole("link", { name: "work", exact: true }).click();
  await expect(page).toHaveURL(`${browserOrigin}/work`);
  await expect(
    page.getByRole("heading", { name: "work · case studies" }),
  ).toBeVisible();
  await expect.poll(() => collectorAborted).toBe(true);
  expect(collectorRequested).toBe(true);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
