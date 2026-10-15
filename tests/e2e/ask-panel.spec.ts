import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const QUESTION = "What results did the lead scoring project get?";
const UNSUPPORTED = "What is your favourite pizza topping?";

interface Traffic {
  url: string;
  method: string;
  body: string | null;
}

async function openPanel(page: Page) {
  await page.getByRole("button", { name: "ask about my work" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ask about my work" }),
  ).toBeVisible();
}

async function ask(page: Page, question: string) {
  const input = page.getByLabel("Your question");
  await input.fill(question);
  await input.press("Enter");
}

function watch(page: Page): Traffic[] {
  const seen: Traffic[] = [];
  page.on("request", (req) => {
    seen.push({ url: req.url(), method: req.method(), body: req.postData() });
  });
  return seen;
}

test("keyboard: open, search, inspect a source, close, focus returns", async ({
  page,
}) => {
  await page.goto("/about");
  const trigger = page.getByRole("button", { name: "ask about my work" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ask about my work" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Your question")).toBeFocused();

  await page.keyboard.type("Where are you based?");
  await page.keyboard.press("Enter");
  const first = dialog.locator(".ask-entry").first();
  await expect(first.locator(".ask-q")).toHaveText("Where are you based?");
  await expect(first.locator(".ask-hit").first()).toBeVisible();
  const titleLink = first.locator(".ask-hit-title").first();
  await expect(titleLink).toHaveAttribute("href", "/about#close");
  await expect(dialog.getByRole("status")).toContainText("sources found");

  await titleLink.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/about#close$/);

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  const sourceLink = dialog.locator(".ask-source a").first();
  await sourceLink.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/about#close$/);

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("example questions search when chosen", async ({ page }) => {
  await page.goto("/");
  await openPanel(page);
  await page.getByRole("button", { name: "Where are you based?" }).click();
  await expect(
    page.locator(".ask-entry").first().locator(".ask-hit").first(),
  ).toBeVisible();
  await expect(page.locator(".ask-entry").first()).toContainText("Washington");
});

test("clearing history cancels a pending search without clearing newer input", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "korab-ask-history",
      JSON.stringify({ v: 1, q: ["Earlier question"] }),
    );
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let complete!: () => void;
  const completed = new Promise<void>((resolve) => {
    complete = resolve;
  });
  await page.route("**/ask-index.json", async (route) => {
    await held;
    await route.continue();
    complete();
  });
  await page.goto("/about");
  await openPanel(page);
  const input = page.getByLabel("Your question");
  await input.fill(QUESTION);
  await input.press("Enter");
  await page.getByRole("button", { name: "clear history" }).click();
  await input.fill("newer draft");

  const response = page.waitForResponse("**/ask-index.json");
  release();
  await response;
  await completed;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

  await expect(page.locator(".ask-entry")).toHaveCount(0);
  await expect(input).toHaveValue("newer draft");
});

test("history survives navigation, can be cleared, and is gone after a new session", async ({
  page,
  browser,
}) => {
  await page.goto("/about");
  await openPanel(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-entry")).toHaveCount(1);

  await page
    .locator(".ask-entry a[href^='/work/lead-scoring']")
    .first()
    .click();
  await expect(page).toHaveURL(/\/work\/lead-scoring/);
  await openPanel(page);
  await expect(page.locator(".ask-entry .ask-q")).toHaveText(QUESTION);

  await page.getByRole("button", { name: "clear history" }).click();
  await expect(page.locator(".ask-entry")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("History cleared.");
  await page.reload();
  await openPanel(page);
  await expect(page.locator(".ask-entry")).toHaveCount(0);

  await ask(page, QUESTION);
  await expect(page.locator(".ask-entry")).toHaveCount(1);
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/about");
  await openPanel(other);
  await expect(other.locator(".ask-entry")).toHaveCount(0);
  await fresh.close();
});

test("an unsupported question offers reading and contact links", async ({
  page,
}) => {
  await page.goto("/about");
  await openPanel(page);
  await ask(page, UNSUPPORTED);
  const entry = page.locator(".ask-entry").first();
  await expect(entry).toContainText("Nothing on this site answers that");
  await expect(entry.getByRole("link", { name: "Work" })).toHaveAttribute(
    "href",
    "/work",
  );
  await expect(entry.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    "mailto:hello@korabeland.com",
  );
  await expect(entry.locator(".ask-hit")).toHaveCount(0);
});

test("no question text leaves the browser, and only event names are counted", async ({
  page,
}) => {
  const counted: string[] = [];
  await page.route("**/api/ask-count", async (route) => {
    counted.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });
  const traffic = watch(page);
  await page.goto("/about");
  await openPanel(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  await ask(page, UNSUPPORTED);
  await expect(page.locator(".ask-entry")).toHaveCount(2);
  // Closing and reopening in the same session is not a second open.
  await page.keyboard.press("Escape");
  await openPanel(page);

  expect(counted.map((b) => JSON.parse(b))).toEqual([
    { event: "open" },
    { event: "question" },
    { event: "answer" },
    { event: "question" },
    { event: "fallback" },
  ]);
  const all = JSON.stringify(traffic);
  for (const word of ["lead scoring", "pizza", "favourite"]) {
    expect(all.toLowerCase()).not.toContain(word);
  }
  // Only the corpus download and the bare counters are ever requested.
  const asked = traffic
    .filter((t) => /ask-index|ask-count/.test(t.url))
    .map((t) => `${t.method} ${new URL(t.url).pathname}`);
  expect(new Set(asked)).toEqual(
    new Set(["GET /ask-index.json", "POST /api/ask-count"]),
  );
  const stored = await page.evaluate(() =>
    JSON.stringify([{ ...localStorage }, document.cookie]),
  );
  expect(stored.toLowerCase()).not.toContain("lead scoring");
});

test("search still works when the counter endpoint fails", async ({ page }) => {
  await page.route("**/api/ask-count", (route) => route.abort());
  await page.goto("/about");
  await openPanel(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  await page.route("**/api/ask-count", (route) =>
    route.fulfill({ status: 500 }),
  );
  await ask(page, "What is Perian?");
  await expect(page.locator(".ask-entry")).toHaveCount(2);
});

test("a failed corpus download shows reading and contact links and counts an error", async ({
  page,
}) => {
  const counted: string[] = [];
  await page.route("**/api/ask-count", async (route) => {
    counted.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });
  await page.route("**/ask-index.json", (route) =>
    route.fulfill({ status: 500 }),
  );
  await page.goto("/about");
  await openPanel(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-entry").first()).toContainText(
    "Search could not load",
  );
  await expect(
    page.locator(".ask-entry").first().getByRole("link", { name: "Email" }),
  ).toBeVisible();
  expect(counted.map((b) => JSON.parse(b).event)).toEqual([
    "open",
    "question",
    "error",
  ]);
});

test("mobile: the panel fits the screen and search works by touch", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/work");
  await openPanel(page);
  const box = await page.locator("dialog[open]").boundingBox();
  expect(box?.width).toBeLessThanOrEqual(375);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(812 + 1);
  await page.getByLabel("Your question").fill(QUESTION);
  await page.getByRole("button", { name: "search", exact: true }).tap();
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "close", exact: true }).tap();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await context.close();
});

for (const width of [375, 768, 1024, 1280]) {
  test(`the trigger does not widen the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/work");
    await page.locator("main#main").waitFor({ state: "visible" });
    await expect(
      page.getByRole("button", { name: "ask about my work" }),
    ).toBeVisible();
    const wider = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(wider).toBe(false);
  });
}

test("the open panel has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/about");
  await openPanel(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  const results = await new AxeBuilder({ page })
    .exclude("vite-error-overlay")
    .analyze();
  const bad = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(bad, JSON.stringify(bad, null, 2)).toHaveLength(0);
});

test("private and utility pages do not offer the panel", async ({ page }) => {
  await page.goto("/off-trail");
  await expect(
    page.getByRole("button", { name: "ask about my work" }),
  ).toHaveCount(0);
  await page.goto("/for/demo");
  await expect(
    page.getByRole("button", { name: "ask about my work" }),
  ).toHaveCount(0);
});

test("without JavaScript the trigger stays hidden", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/about");
  await expect(page.locator("[data-ask-open]")).toBeHidden();
  await context.close();
});
