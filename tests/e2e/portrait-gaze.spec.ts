import { expect, test } from "@playwright/test";

// R11 / R12 / AE3 — the gaze rig's reduced-motion + coarse-pointer bail is the
// cross-layer behaviour the pure gaze-math unit tests can't prove. The default
// Playwright context runs with `reducedMotion: "reduce"` (playwright.config.ts),
// so the component's double gate bails before attaching a single listener: the
// additive overlay stays in the DOM but hidden and inert, and a pointer sweep
// through the proximity band moves nothing. This is exactly the path every
// visual baseline is screenshotted on, which is why the rig can't churn them.
//
// The live gaze itself is intentionally NOT asserted here — default Playwright
// never engages it (reduced-motion), matching the shift-log torch spec's
// rationale. This guards the property that actually matters in production: the
// quiet path stays quiet.
//
// Runs under the `e2e` project, whose testMatch globs **/e2e/*.spec.ts.

test.describe("portrait gaze — gated off under reduced motion", () => {
  test("the overlay stays hidden and inert through a pointer sweep", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      // Astro's dev toolbar reads localStorage unguarded under .vite/deps — a
      // dev-only artifact that never ships. Filter it the way the shift-log
      // torch spec does; assert our own scripts stay silent.
      if ((err.stack ?? "").includes("node_modules/.vite/deps")) return;
      errors.push(err.message);
    });

    await page.goto("/");

    // The overlay is additive markup: present in the DOM, but display:none and
    // never marked live until the gate passes (which it never does here).
    const overlay = page.locator("[data-portrait-gaze]");
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toBeHidden();
    await expect(overlay).not.toHaveClass(/is-live/);

    // Sweep the pointer through the proximity band and across the image itself,
    // where a live rig would saccade. The gate should have prevented any
    // listener, so this is inert.
    const fig = page.locator(".hero-portrait");
    const box = await fig.boundingBox();
    if (!box) throw new Error("hero portrait has no bounding box");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - box.width, cy); // in band, left of the image
    await page.mouse.move(cx, cy); // inside the image
    await page.mouse.move(cx + box.width, cy); // in band, right of the image
    // Give any (wrongly-attached) rAF commit a frame to land before asserting.
    await page.waitForTimeout(100);

    // No pupil received a committed gaze offset, and the overlay is still hidden.
    const committed = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(".gaze-pupil"),
        ).filter((p) => p.style.getPropertyValue("--gaze-dx") !== "").length,
    );
    expect(committed).toBe(0);
    await expect(overlay).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("no gaze rig mounts on other Portrait renders (R5)", async ({
    page,
  }) => {
    // The about page renders the same Portrait component without the gaze prop,
    // so the overlay and its data hook must not be present at all.
    await page.goto("/about");
    await expect(page.locator("[data-portrait-gaze]")).toHaveCount(0);
  });
});
