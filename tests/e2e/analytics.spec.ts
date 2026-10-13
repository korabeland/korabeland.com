import { expect, test } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

const browserOrigin = "http://korabeland.com";
const collectorPath = "/_vercel/insights/script.js";

test("public pageviews keep secrets out of collector request headers", async ({
  page,
}) => {
  const requests: {
    url: string;
    headers: Record<string, string>;
    body: string | null;
  }[] = [];
  let scriptLoads = 0;
  let pageviews = 0;

  await page.route(`${browserOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === collectorPath) {
      scriptLoads += 1;
      await route.fulfill({
        contentType: "application/javascript",
        body: `
          const beforeSend = (window.vaq || []).find(([name]) => name === "beforeSend")?.[1];
          const event = { type: "pageview", url: window.location.href };
          const filtered = beforeSend ? beforeSend(event) : event;
          if (filtered) {
            fetch("/_vercel/insights/view", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(filtered)
            });
          }
        `,
      });
      return;
    }
    if (requestUrl.pathname === "/_vercel/insights/view") {
      pageviews += 1;
      requests.push({
        url: `${requestUrl.pathname}${requestUrl.search}`,
        headers: route.request().headers(),
        body: route.request().postData(),
      });
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
    page.getByRole("heading", {
      name: "Turning ambiguous problems into systems",
    }),
  ).toBeVisible();
  await expect.poll(() => pageviews).toBe(1);
  expect(scriptLoads).toBe(1);
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe("/_vercel/insights/view");
  expect(requests[0].headers.referer).toBe(`${browserOrigin}/`);
  expect(requests[0].body).not.toBeNull();
  expect(JSON.parse(requests[0].body ?? "{}")).toEqual({
    type: "pageview",
    url: `${browserOrigin}/about`,
  });
  expect(JSON.stringify(requests[0])).not.toContain("SECRET");
  expect(JSON.stringify(requests[0])).not.toContain("private-fragment");
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
    page.getByRole("heading", {
      name: "Turning ambiguous problems into systems",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "work", exact: true }).click();
  await expect(page).toHaveURL(`${browserOrigin}/work`);
  await expect(
    page.getByRole("heading", { name: /evidence behind the outcomes/i }),
  ).toBeVisible();
});
