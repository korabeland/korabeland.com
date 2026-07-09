import { expect, test } from "@playwright/test";

// R9 / AE3 — the torch's reduced-motion + coarse-pointer bail is the cross-layer
// behaviour the pure falloff unit tests can't prove. The default Playwright
// context runs with `reducedMotion: "reduce"` (playwright.config.ts), so the
// component's double-gate bails before attaching a single listener: sweeping the
// pointer across the grid must leave every cell without an inline box-shadow.
//
// The live glow itself is intentionally NOT asserted here — default Playwright
// never renders it (reduced-motion), and forcing a `no-preference` context to
// test decorative motion buys little over the unit-tested math plus the manual
// visual check (see the plan's deferred "deterministic glow harness"). This spec
// guards the property that actually matters in production: the quiet path stays
// quiet.
//
// Runs under the `e2e` project, whose testMatch globs **/e2e/*.spec.ts.

test.describe("shift-log torch — gated off under reduced motion", () => {
  test("a pointer sweep over the grid lights no cell", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      // Astro's dev toolbar reads localStorage unguarded under .vite/deps — a
      // dev-only artifact that never ships. Filter it the way shift.spec.ts and
      // accessibility.test.ts filter their dev-server noise; assert our own
      // scripts stay silent.
      if ((err.stack ?? "").includes("node_modules/.vite/deps")) return;
      errors.push(err.message);
    });

    await page.goto("/");
    const grid = page.locator(".shiftlog-grid");
    await expect(grid).toBeVisible();

    // Sweep across the grid's busiest region — where a live torch would bloom
    // the level 3-4 cells. The gate should have prevented any listener, so this
    // is inert.
    const box = await grid.boundingBox();
    if (!box) throw new Error("shift-log grid has no bounding box");
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
    // Give any (wrongly-attached) rAF paint a frame to land before asserting.
    await page.waitForTimeout(100);

    const glowingCells = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(".shiftlog-cell"),
        ).filter(
          (cell) => cell.style.boxShadow && cell.style.boxShadow !== "none",
        ).length,
    );

    expect(glowingCells).toBe(0);
    expect(errors).toEqual([]);
  });
});
