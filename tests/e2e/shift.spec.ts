import { expect, test } from "@playwright/test";

// R7 — the night/day shift toggle. This spec manages its own storage state
// per test rather than relying on inherited pinning: U3 pins `data-time` to
// "night" globally (init-script localStorage seed) for screenshot/a11y
// determinism, so tests here that need clean or day-seeded storage clear or
// set it explicitly instead of assuming a blank slate.
//
// Note: this file only executes once U3 widens the `e2e` project's
// `testMatch` from `**/routes.spec.ts` to `**/e2e/*.spec.ts` — until then it
// is present but not run by CI.

test.describe("shift toggle — clean storage", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("clicking the toggle flips data-time, aria-pressed, and the label", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.locator(".shift-toggle");
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(
      () => document.documentElement.dataset.time,
    );
    const wasDay = before === "day";

    await toggle.click();

    const after = await page.evaluate(
      () => document.documentElement.dataset.time,
    );
    expect(after).toBe(wasDay ? "night" : "day");
    await expect(toggle).toHaveAttribute(
      "aria-pressed",
      wasDay ? "false" : "true",
    );
    await expect(toggle).toHaveText(wasDay ? "shift: night" : "shift: day");
  });

  test("an explicit choice survives a reload and a cross-page navigation", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.locator(".shift-toggle");
    await toggle.click();
    const chosen = await page.evaluate(
      () => document.documentElement.dataset.time,
    );

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-time",
      chosen ?? "",
    );

    await page.goto("/about");
    await expect(page.locator("html")).toHaveAttribute(
      "data-time",
      chosen ?? "",
    );
  });

  test("session default is computed once and cached to sessionStorage", async ({
    page,
  }) => {
    await page.goto("/");
    const session = await page.evaluate(() =>
      sessionStorage.getItem("korab-shift-session"),
    );
    expect(session).toMatch(/^(day|night)$/);
  });

  test("storage-blocked resilience: page still renders when localStorage throws", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked");
        },
      });
    });

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "data-time",
      /day|night/,
    );
    expect(errors).toEqual([]);
  });
});

test.describe("shift toggle — stored night, query override", () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:4321",
          localStorage: [{ name: "korab-shift", value: "night" }],
        },
      ],
    },
  });

  test("?shift=day renders day regardless of a stored night choice, and does not persist", async ({
    page,
  }) => {
    await page.goto("/?shift=day");
    await expect(page.locator("html")).toHaveAttribute("data-time", "day");

    const stored = await page.evaluate(() =>
      localStorage.getItem("korab-shift"),
    );
    expect(stored).toBe("night");
  });
});

// No-JS: the toggle is server-rendered `hidden` and revealed only by its own
// script, so a no-JS visitor sees no dead control at all — a structural
// guarantee from markup, not something the default e2e project (which always
// runs with JS enabled) can directly exercise.
