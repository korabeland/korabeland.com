import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The Ask section lives on the About page only. These tests drive it the way a
// visitor does: tap an example or type a question, read the result, follow a
// source, clear the history.

const QUESTION = "What results did the lead scoring project get?";
const UNSUPPORTED = "What is your favourite pizza topping?";

interface Traffic {
  url: string;
  method: string;
  body: string | null;
}

async function gotoAbout(page: Page) {
  await page.goto("/about");
  await expect(page.locator("[data-ask-section]")).toBeVisible();
}

async function ask(page: Page, question: string) {
  const input = page.getByLabel("Or ask your own");
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

test("the section sits after the story and before how I operate", async ({
  page,
}) => {
  await gotoAbout(page);
  const askTop = await page
    .locator("[data-ask-section]")
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const storyTop = await page
    .locator(".about-body")
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const operateTop = await page
    .locator(".about-operate")
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(storyTop).toBeLessThan(askTop);
  expect(askTop).toBeLessThan(operateTop);
});

test("keyboard: reach an example, search, inspect a source, clear history", async ({
  page,
}) => {
  await gotoAbout(page);
  const first = page.getByRole("button", { name: QUESTION });
  await first.focus();
  await page.keyboard.press("Enter");
  const entry = page.locator(".ask-entry").first();
  await expect(entry.locator(".ask-q")).toHaveText(QUESTION);
  await expect(entry.locator(".ask-hit").first()).toBeVisible();
  await expect(
    entry.locator("a[href^='/work/lead-scoring']").first(),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("sources found");

  // Typing a question and pressing Enter works from the keyboard alone.
  const input = page.getByLabel("Or ask your own");
  await input.focus();
  await page.keyboard.type("What is Perian?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".ask-entry")).toHaveCount(2);
  // The newest answer is open; the earlier one is folded under its question.
  await expect(page.locator(".ask-entry").first()).toHaveAttribute("open", "");
  await expect(page.locator(".ask-entry").nth(1)).not.toHaveAttribute(
    "open",
    "",
  );

  const clear = page.getByRole("button", { name: "clear history" });
  await clear.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ask-entry")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("History cleared.");
  await expect(input).toBeFocused();
});

test("an empty question asks for one and counts nothing", async ({ page }) => {
  const counted: string[] = [];
  await page.route("**/api/ask-count", async (route) => {
    counted.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });
  await gotoAbout(page);
  await page.getByRole("button", { name: "search", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Type a question first.");
  expect(counted.filter((b) => b.includes("question"))).toEqual([]);
});

test("every example question shows a useful result in one tap", async ({
  page,
}) => {
  await gotoAbout(page);
  const examples = page.locator("[data-ask-example]");
  const count = await examples.count();
  expect(count).toBeGreaterThanOrEqual(2);
  expect(count).toBeLessThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    await examples.nth(i).click();
    await expect(
      page.locator(".ask-entry").first().locator(".ask-hit").first(),
    ).toBeVisible();
  }
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
    await route.fulfill({ response: await route.fetch() });
    complete();
  });
  await gotoAbout(page);
  const input = page.getByLabel("Or ask your own");
  await input.fill(QUESTION);
  await input.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Searching…");
  await page.getByRole("button", { name: "clear history" }).click();
  await input.fill("newer draft");

  release();
  await completed;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  await expect(page.locator(".ask-entry")).toHaveCount(0);
  await expect(input).toHaveValue("newer draft");
});

test("a question is saved before the index loads, so leaving the page keeps it", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/ask-index.json", async (route) => {
    await held;
    await route.abort();
  });
  await gotoAbout(page);
  await ask(page, QUESTION);
  await expect(page.getByRole("status")).toHaveText("Searching…");
  const stored = await page.evaluate(() =>
    sessionStorage.getItem("korab-ask-history"),
  );
  expect(stored).toContain(QUESTION);
  release();
});

test("history survives navigation, can be cleared, and is gone after a new session", async ({
  page,
  browser,
}) => {
  await gotoAbout(page);
  await ask(page, QUESTION);
  await expect(page.locator(".ask-entry")).toHaveCount(1);

  await page
    .locator(".ask-entry a[href^='/work/lead-scoring']")
    .first()
    .click();
  await expect(page).toHaveURL(/\/work\/lead-scoring/);
  // The section lives on /about; the history waits there for the same tab.
  await page.goto("/about");
  await expect(page.locator(".ask-entry .ask-q")).toHaveText(QUESTION);

  await page.getByRole("button", { name: "clear history" }).click();
  await expect(page.locator(".ask-entry")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("History cleared.");
  await page.reload();
  await expect(page.locator(".ask-entry")).toHaveCount(0);

  await ask(page, QUESTION);
  await expect(page.locator(".ask-entry")).toHaveCount(1);
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/about");
  await expect(other.locator("[data-ask-section]")).toBeVisible();
  await expect(other.locator(".ask-entry")).toHaveCount(0);
  await fresh.close();
});

test("a source link to this page lands on the passage and keeps the section usable", async ({
  page,
}) => {
  await gotoAbout(page);
  await ask(page, "Where are you based?");
  await page.locator(".ask-entry a[href='/about#close']").first().click();
  await expect(page).toHaveURL(/\/about#close$/);
  await expect(page.locator("[data-ask-section]")).toBeVisible();
  await expect(page.getByLabel("Or ask your own")).toBeEnabled();
});

test("an unsupported question offers reading and contact links", async ({
  page,
}) => {
  await gotoAbout(page);
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
  await gotoAbout(page);
  await page.getByLabel("Or ask your own").focus();
  await ask(page, QUESTION);
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  await ask(page, UNSUPPORTED);
  await expect(page.locator(".ask-entry")).toHaveCount(2);
  // Reaching for the section again in the same session is not a second open.
  await page.getByLabel("Or ask your own").focus();
  await page.getByLabel("Or ask your own").click();

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
  await gotoAbout(page);
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
  await gotoAbout(page);
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

test("mobile: one tap on an example works and the page does not scroll sideways", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await gotoAbout(page);
  const example = page.getByRole("button", { name: QUESTION });
  const box = await example.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await example.tap();
  await expect(page.locator(".ask-hit").first()).toBeVisible();
  const field = page.getByLabel("Or ask your own");
  await field.fill("What is Perian?");
  await page.getByRole("button", { name: "search", exact: true }).tap();
  await expect(page.locator(".ask-entry")).toHaveCount(2);
  const wider = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(wider).toBe(false);
  await context.close();
});

for (const width of [375, 768, 1280]) {
  test(`the About page does not scroll sideways at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await gotoAbout(page);
    await ask(page, QUESTION);
    await expect(page.locator(".ask-hit").first()).toBeVisible();
    const wider = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(wider).toBe(false);
  });
}

for (const theme of ["night", "day"]) {
  test(`the section has no serious accessibility violations in the ${theme} shift`, async ({
    page,
  }) => {
    await page.addInitScript((t) => {
      localStorage.setItem("korab-shift", t);
    }, theme);
    await gotoAbout(page);
    await ask(page, QUESTION);
    await expect(page.locator(".ask-hit").first()).toBeVisible();
    await ask(page, UNSUPPORTED);
    await expect(page.locator(".ask-entry")).toHaveCount(2);
    const results = await new AxeBuilder({ page })
      .exclude("vite-error-overlay")
      .analyze();
    const bad = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(bad, JSON.stringify(bad, null, 2)).toHaveLength(0);
  });
}

test("only the About page offers the section, and other pages load none of it", async ({
  page,
}) => {
  const requested: string[] = [];
  page.on("request", (req) => requested.push(req.url()));
  for (const path of [
    "/",
    "/work",
    "/work/lead-scoring",
    "/lab",
    "/notes",
    "/colophon",
  ]) {
    await page.goto(path);
    await page.locator("main#main").waitFor({ state: "visible" });
    await expect(page.locator("[data-ask-section]"), path).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /ask about my work/i }),
      path,
    ).toHaveCount(0);
    await expect(page.locator("dialog"), path).toHaveCount(0);
  }
  expect(
    requested.filter((u) =>
      /ask-index|ask-count|AskSection|controller/.test(u),
    ),
  ).toEqual([]);
  await gotoAbout(page);
});

test("private and utility pages do not offer the section", async ({ page }) => {
  await page.goto("/off-trail");
  await expect(page.locator("[data-ask-section]")).toHaveCount(0);
  await page.goto("/for/demo");
  await expect(page.locator("[data-ask-section]")).toHaveCount(0);
});

test("without JavaScript the section stays hidden", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/about");
  await expect(page.locator("[data-ask-section]")).toBeHidden();
  await context.close();
});
