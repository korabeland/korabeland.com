import { test } from "@chromatic-com/playwright";
import { expect } from "@playwright/test";

// U8 — pinned-pose visual record for the gaze v2 rig. The production hero never
// shows the rig under reduced-motion (the screenshot path), so /dev/gaze-v2-poses
// is the only visual coverage of the composited eye. This spec drives that route
// for both shifts and lets the @chromatic-com/playwright fixture archive it (the
// blocking visual gate on PRs). It also asserts the poses are genuinely pinned
// and every layer decoded (no 404s), so a broken asset or geometry regression
// fails here in addition to Chromatic.
//
// Runs under its own `gaze-poses` project (playwright.config.ts) at one desktop
// viewport — the harness is fixed-width per cell, so extra viewports would be
// pure redundancy. A sibling spec under an unlisted testMatch would silently
// never run; the dedicated project is what makes it execute.

const POSE_NAMES = [
  "rest",
  "max-left",
  "max-right",
  "max-up",
  "max-down",
  "converged-near",
  "overshoot-extreme",
];

for (const shift of ["night", "day"] as const) {
  const route =
    shift === "night" ? "/dev/gaze-v2-poses" : "/dev/gaze-v2-poses?shift=day";

  test(`gaze v2 pinned poses — ${shift}`, async ({ page }) => {
    // The dev server may 404 a prerender=false route during its first-hit Vite
    // dep-optimisation window; poll until it serves the grid.
    await expect
      .poll(async () => (await page.goto(route))?.status() ?? 0, {
        timeout: 15000,
      })
      .toBe(200);

    // Deterministic readiness: the route flips this once every layer decoded.
    // Value matchers only (not locator matchers) — the Chromatic `test` fixture
    // supplies a Page whose Locator type doesn't line up with @playwright/test's
    // locator-matcher augmentation, so we assert over page.evaluate results.
    await expect
      .poll(() => page.evaluate(() => document.body.dataset.posesReady), {
        timeout: 15000,
      })
      .toBe("true");

    // All seven poses present, in order, and every layer image decoded (a 404
    // leaves naturalWidth 0) — 7 poses × 2 eyes × 4 layers.
    const dom = await page.evaluate(() => {
      const captions = Array.from(
        document.querySelectorAll("figure.cell figcaption"),
      ).map((c) => c.textContent?.trim() ?? "");
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>(".rig-eye .layer"),
      );
      return {
        captions,
        layerTotal: imgs.length,
        layerBroken: imgs.filter((i) => i.naturalWidth === 0).length,
      };
    });
    expect(dom.captions).toEqual(POSE_NAMES);
    expect(dom.layerTotal).toBe(POSE_NAMES.length * 2 * 4);
    expect(dom.layerBroken).toBe(0);

    // Poses are genuinely pinned differently: rest sprites carry no offset,
    // max-right sprites carry a positive-x translate. Proves the harness isn't
    // rendering one frozen frame for every cell.
    const offsets = await page.evaluate(() => {
      const spriteX = (caption: string) => {
        const cell = Array.from(document.querySelectorAll("figure.cell")).find(
          (c) => c.querySelector("figcaption")?.textContent?.trim() === caption,
        );
        const s = cell?.querySelector<HTMLElement>(".layer.sprite");
        const m = (s?.style.transform ?? "").match(/translate\(([-0-9.]+)px/);
        return m ? Number.parseFloat(m[1]) : 0;
      };
      return { rest: spriteX("rest"), maxRight: spriteX("max-right") };
    });
    expect(offsets.rest).toBe(0);
    expect(offsets.maxRight).toBeGreaterThan(0);

    // Hand the fully-settled page to the Chromatic archive fixture.
    await page.screenshot({ fullPage: true });
  });
}
