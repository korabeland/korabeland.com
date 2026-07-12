import { expect, test } from "@playwright/test";

// R5 / R11 / AE5 / AE8 — the gaze rig's reduced-motion + coarse-pointer bail is
// the cross-layer behaviour the pure gaze-math unit tests can't prove. The
// default Playwright context runs with `reducedMotion: "reduce"`
// (playwright.config.ts), so the component's double gate bails before it ever
// constructs an Image: the additive overlay stays in the DOM but hidden and
// inert, its four-layer-per-eye sprites are never created, and — the property
// that actually matters — NOT ONE byte under /portrait/rig/ is fetched. The rig
// layers are JS-fetched only after the gate passes, so the gated-off path is the
// exact path every visual baseline is screenshotted on, which is why the rig can
// never churn a baseline or add a network request to the quiet render.
//
// The live gaze itself is intentionally NOT asserted here — default Playwright
// never engages it (reduced-motion), matching the shift-log torch spec's
// rationale. Headed-browser judgement covers the live motion.
//
// Runs under the `e2e` project, whose testMatch globs **/e2e/*.spec.ts.

test.describe("portrait gaze — gated off under reduced motion", () => {
  test("the rig stays hidden, inert, and fetches no layers through a pointer sweep", async ({
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

    // AE5, the strong form: the layer images exist only as post-gate `new
    // Image()` fetches. Record every rig asset the page requests; under
    // reduced-motion it must stay empty.
    const rigRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/portrait/rig/")) rigRequests.push(req.url());
    });

    await page.goto("/");

    // The rig is additive markup: present in the DOM, but display:none and never
    // marked live until the gate passes (which it never does here).
    const rig = page.locator("[data-portrait-rig]");
    await expect(rig).toHaveCount(1);
    await expect(rig).toBeHidden();
    await expect(rig).not.toHaveClass(/is-live/);

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

    // No sprite layer was ever constructed (they are appended only in the
    // post-gate startRig), so none carries a committed transform, and the rig is
    // still hidden.
    const spritesWithTransform = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(".rig-sprite"),
        ).filter((s) => s.style.transform !== "").length,
    );
    expect(spritesWithTransform).toBe(0);
    await expect(rig).toBeHidden();

    // The load-bearing invariant: gated-off, the rig fetched nothing.
    expect(rigRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("no gaze rig mounts on other Portrait renders (R5)", async ({
    page,
  }) => {
    // The about page renders the same Portrait component without the gaze prop,
    // so the rig and its data hook must not be present at all.
    await page.goto("/about");
    await expect(page.locator("[data-portrait-rig]")).toHaveCount(0);
  });
});
