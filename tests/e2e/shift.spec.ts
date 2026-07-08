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

  test("clicking the toggle flips data-time, aria-pressed, label, and theme-color", async ({
    page,
  }) => {
    // Start from a known night state via the (non-persisted) query override so
    // the post-click assertions are absolute, not relative to the CI wall clock.
    await page.goto("/?shift=night");
    const toggle = page.locator(".shift-toggle");
    await expect(toggle).toBeVisible();
    // Icon-only switch: night shows the moon on the knob, aria-pressed=false.
    await expect(toggle.locator(".knob .knob-icon--moon")).toBeVisible();
    await expect(toggle.locator(".knob .knob-icon--sun")).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();

    await expect(page.locator("html")).toHaveAttribute("data-time", "day");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle.locator(".knob .knob-icon--sun")).toBeVisible();
    await expect(toggle.locator(".knob .knob-icon--moon")).toBeHidden();
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f2f1ea",
    );
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
    // The click must write the explicit choice to localStorage, not merely
    // change the current view — otherwise "survives reload" could pass by an
    // hour coincidence.
    expect(await page.evaluate(() => localStorage.getItem("korab-shift"))).toBe(
      chosen,
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
    page.on("pageerror", (err) => {
      // Astro's dev toolbar reads localStorage unguarded (getSettings, bundled
      // under .vite/deps). That code ships only in dev, never to production, so
      // its throw is not our concern — this test asserts our own scripts stay
      // silent. Filter it the way accessibility.test.ts filters vite-error-overlay.
      if ((err.stack ?? "").includes("node_modules/.vite/deps")) return;
      errors.push(err.message);
    });

    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("blocked");
        },
      });
    });

    await page.goto("/");

    // The block must actually be in effect, or this test proves nothing.
    const blocked = await page.evaluate(() => {
      try {
        const probe = window.localStorage;
        return probe === undefined;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);

    // The head script swallowed the throw and still applied a palette.
    await expect(page.locator("html")).toHaveAttribute(
      "data-time",
      /day|night/,
    );

    // The toggle still flips the current view even though it cannot persist.
    const toggle = page.locator(".shift-toggle");
    await expect(toggle).toBeVisible();
    const before = await page.evaluate(
      () => document.documentElement.dataset.time,
    );
    await toggle.click();
    const after = await page.evaluate(
      () => document.documentElement.dataset.time,
    );
    expect(after).not.toBe(before);

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
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f2f1ea",
    );

    // The query override neither overwrites the explicit stored choice nor
    // writes the session default (that write lives only in the hour branch).
    const [stored, session] = await page.evaluate(() => [
      localStorage.getItem("korab-shift"),
      sessionStorage.getItem("korab-shift-session"),
    ]);
    expect(stored).toBe("night");
    expect(session).toBeNull();
  });
});

// No-JS: the toggle is server-rendered `hidden` and revealed only by its own
// script, so a no-JS visitor sees no dead control at all — a structural
// guarantee from markup, not something the default e2e project (which always
// runs with JS enabled) can directly exercise.
