import { expect, type Page, test } from "@playwright/test";

// The home portrait ships two palettes but only the visible one is fetched up
// front; the other is warmed after the page has loaded so the shift toggle is
// still instant. A toggle that beats the warm-up pins the old palette until the
// new one has decoded, so the portrait is never blank. See
// src/components/Portrait/index.astro and PortraitPreload.astro.

const SHIFTS = ["night", "day"] as const;
type Shift = (typeof SHIFTS)[number];
const other = (s: Shift): Shift => (s === "night" ? "day" : "night");
// Night files are portrait-illustrated.gen.*, day files portrait-illustrated-day.gen.*.
const isDayFile = (url: string) => url.includes("/portrait-illustrated-day.");
const isBaseFile = (url: string) =>
  /\/portrait\/portrait-illustrated(-day)?\.gen\.\d+\.(avif|webp|jpg)$/.test(
    url,
  );

/** One animation frame per entry: which palettes are on screen and are they painted. */
async function sampleFrames(page: Page, frames: number) {
  return page.evaluate(
    (n) =>
      new Promise<{ shown: string[]; ready: boolean }[]>((resolve) => {
        const out: { shown: string[]; ready: boolean }[] = [];
        const tick = () => {
          const visible = [
            ...document.querySelectorAll<HTMLElement>(
              ".portrait-stack picture",
            ),
          ].filter((p) => getComputedStyle(p).display !== "none");
          out.push({
            shown: visible.map((p) =>
              p.classList.contains("portrait-day") ? "day" : "night",
            ),
            ready: visible.every((p) => {
              const img = p.querySelector("img");
              return !!img && img.complete && img.naturalWidth > 0;
            }),
          });
          if (out.length < n) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

const hiddenIsReady = (page: Page, shift: Shift) =>
  page.evaluate((s) => {
    const img = document.querySelector<HTMLImageElement>(`.portrait-${s} img`);
    return !!img && img.complete && img.naturalWidth > 0;
  }, shift);

for (const shift of SHIFTS) {
  test.describe(`home portrait, ${shift} shift`, () => {
    test("fetches only the visible palette up front, then warms the other", async ({
      page,
    }) => {
      const requested: { url: string; afterLoad: boolean }[] = [];
      let loaded = false;
      page.on("load", () => {
        loaded = true;
      });
      page.on("request", (req) => {
        if (isBaseFile(req.url())) {
          requested.push({ url: req.url(), afterLoad: loaded });
        }
      });

      await page.goto(`/?shift=${shift}`, { waitUntil: "load" });

      const upFront = requested.filter((r) => !r.afterLoad);
      expect(upFront.length).toBeGreaterThan(0);
      expect(upFront.every((r) => isDayFile(r.url) === (shift === "day"))).toBe(
        true,
      );

      await expect.poll(() => hiddenIsReady(page, other(shift))).toBe(true);
      expect(
        requested.some(
          (r) => r.afterLoad && isDayFile(r.url) !== (shift === "day"),
        ),
      ).toBe(true);
    });

    test("toggling after the warm-up swaps palettes with no blank or stale frame", async ({
      page,
    }) => {
      await page.goto(`/?shift=${shift}`, { waitUntil: "load" });
      await expect.poll(() => hiddenIsReady(page, other(shift))).toBe(true);

      await page.locator(".shift-toggle").click();
      const frames = await sampleFrames(page, 30);

      for (const frame of frames) {
        expect(frame).toEqual({ shown: [other(shift)], ready: true });
      }
      await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
        "data-hold",
        /.*/,
      );
    });

    test("a toggle before the hidden palette is fetched holds the old palette instead of going blank", async ({
      page,
    }) => {
      // Save-Data skips the warm-up, so the hidden palette is guaranteed not to
      // be fetched when the toggle lands; the delay keeps it pending long
      // enough to observe the hold.
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true },
        });
      });
      await page.route(
        "**/portrait/portrait-illustrated*.avif",
        async (route) => {
          if (isDayFile(route.request().url()) !== (shift === "day")) {
            await new Promise((r) => setTimeout(r, 600));
          }
          await route.continue();
        },
      );
      await page.goto(`/?shift=${shift}`, { waitUntil: "load" });
      expect(await hiddenIsReady(page, other(shift))).toBe(false);
      await page.locator(".shift-toggle").click();

      const frames = await sampleFrames(page, 60);
      expect(frames.every((f) => f.shown.length === 1 && f.ready)).toBe(true);
      // The old palette is what stayed on screen while the new one loaded.
      expect(frames[0].shown).toEqual([shift]);

      await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
        "data-hold",
        /.*/,
      );
      const settled = await sampleFrames(page, 3);
      for (const frame of settled) {
        expect(frame).toEqual({ shown: [other(shift)], ready: true });
      }
    });
  });
}
