import { expect, type Page, test } from "@playwright/test";

const SHIFTS = ["night", "day"] as const;
type Shift = (typeof SHIFTS)[number];
const other = (s: Shift): Shift => (s === "night" ? "day" : "night");
const isDayFile = (url: string) => url.includes("/portrait-illustrated-day.");
const portraitRequests =
  /\/portrait\/portrait-illustrated(-day)?\.gen\.\d+\.(avif|webp|jpg)$/;

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

async function expectPalette(page: Page, shift: Shift) {
  for (const frame of await sampleFrames(page, 3)) {
    expect(frame).toEqual({ shown: [shift], ready: true });
  }
  if (await page.locator("[data-portrait-rig]").count()) {
    await expect(page.locator(`.rig-${shift}`)).toHaveCSS("display", "block");
    await expect(page.locator(`.rig-${other(shift)}`)).toHaveCSS(
      "display",
      "none",
    );
  }
}

for (const route of ["/", "/about"]) {
  for (const shift of SHIFTS) {
    test.describe(`${route} portrait, ${shift} shift`, () => {
      test("fetches only the visible palette initially and starts warming at load", async ({
        page,
      }) => {
        const requested: string[] = [];
        page.on("request", (req) => {
          if (portraitRequests.test(req.url())) requested.push(req.url());
        });

        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(portraitRequests, async (intercepted) => {
          if (isDayFile(intercepted.request().url()) === (shift === "day")) {
            await pending;
          }
          await intercepted.continue();
        });
        try {
          await page.goto(`${route}?shift=${shift}`, {
            waitUntil: "domcontentloaded",
          });
          await page.evaluate(() => {
            window.addEventListener(
              "load",
              () => {
                document.documentElement.dataset.portraitWarmAtLoad = String(
                  Array.from(
                    document.querySelectorAll<HTMLImageElement>(
                      ".portrait-stack > picture img",
                    ),
                  ).every(
                    (img) => img.hasAttribute("src") && img.loading === "eager",
                  ),
                );
              },
              { once: true },
            );
          });
          expect(requested.length).toBeGreaterThan(0);
          expect(
            requested.every((url) => isDayFile(url) === (shift === "day")),
          ).toBe(true);
          release();
          await page.waitForLoadState("load");
          await expect(page.locator("html")).toHaveAttribute(
            "data-portrait-warm-at-load",
            "true",
          );
          await expect.poll(() => hiddenIsReady(page, other(shift))).toBe(true);
          expect(
            requested.some((url) => isDayFile(url) !== (shift === "day")),
          ).toBe(true);
        } finally {
          release();
        }
      });

      test("toggling after warming swaps palettes without blank or stale frames", async ({
        page,
      }) => {
        await page.goto(`${route}?shift=${shift}`);
        await expect.poll(() => hiddenIsReady(page, other(shift))).toBe(true);
        await page.locator(".shift-toggle").click();
        for (const frame of await sampleFrames(page, 30)) {
          expect(frame).toEqual({ shown: [other(shift)], ready: true });
        }
        await page.locator(".shift-toggle").click();
        await expectPalette(page, shift);
        await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
          "data-hold",
          /.*/,
        );
      });

      test("an early toggle switches the theme immediately and the portrait after decoding", async ({
        page,
      }) => {
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(portraitRequests, async (intercepted) => {
          if (isDayFile(intercepted.request().url()) !== (shift === "day")) {
            await pending;
          }
          await intercepted.continue();
        });
        try {
          await page.goto(`${route}?shift=${shift}`, { waitUntil: "load" });
          expect(await hiddenIsReady(page, other(shift))).toBe(false);
          await page.locator(".shift-toggle").click();
          await expect(page.locator("html")).toHaveAttribute(
            "data-time",
            other(shift),
          );
          for (const frame of await sampleFrames(page, 60)) {
            expect(frame).toEqual({ shown: [shift], ready: true });
          }
          await expectPalette(page, shift);
          await page.locator(".shift-toggle").click();
          await expectPalette(page, shift);
          await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
            "data-hold",
            /.*/,
          );
          await page.locator(".shift-toggle").click();
          await expectPalette(page, shift);
          release();
          await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
            "data-hold",
            /.*/,
          );
          await expectPalette(page, other(shift));
        } finally {
          release();
        }
      });

      test.describe("responsive candidate replacement", () => {
        test.use({ deviceScaleFactor: route === "/" ? 3 : 1 });
        test("releases the hold when a replacement candidate decodes", async ({
          page,
        }) => {
          const smallWidth = route === "/" ? 720 : 360;
          const largeWidth = route === "/" ? 1040 : 720;
          let release!: () => void;
          let stalled = false;
          const pending = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.setViewportSize({ width: 600, height: 800 });
          await page.route(portraitRequests, async (intercepted) => {
            const url = intercepted.request().url();
            if (
              isDayFile(url) !== (shift === "day") &&
              url.includes(`.gen.${smallWidth}.`)
            ) {
              stalled = true;
              await pending;
            }
            await intercepted.continue();
          });
          try {
            await page.goto(`${route}?shift=${shift}`, { waitUntil: "load" });
            await expect.poll(() => stalled).toBe(true);
            await page.locator(".shift-toggle").click();
            await expect(page.locator(".portrait-stack")).toHaveAttribute(
              "data-hold",
              shift,
            );
            await expectPalette(page, shift);
            await page.setViewportSize({ width: 1280, height: 800 });
            await expect
              .poll(() =>
                page
                  .locator(`.portrait-${other(shift)} img`)
                  .evaluate((element, width) => {
                    const img = element as HTMLImageElement;
                    return (
                      img.complete &&
                      img.naturalWidth > 0 &&
                      img.currentSrc.includes(`.gen.${width}.`)
                    );
                  }, largeWidth),
              )
              .toBe(true);
            await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
              "data-hold",
              /.*/,
            );
            await expectPalette(page, other(shift));
            await expect.poll(() => hiddenIsReady(page, shift)).toBe(true);
            await page.locator(".shift-toggle").click();
            await expectPalette(page, shift);
          } finally {
            release();
          }
        });
      });

      test("a failed incoming image keeps the usable palette through repeated toggles", async ({
        page,
      }) => {
        await page.route(portraitRequests, async (intercepted) => {
          if (isDayFile(intercepted.request().url()) !== (shift === "day")) {
            await intercepted.abort();
          } else {
            await intercepted.continue();
          }
        });
        await page.goto(`${route}?shift=${shift}`);
        await expect
          .poll(() =>
            page.evaluate((s) => {
              const img = document.querySelector<HTMLImageElement>(
                `.portrait-${s} img`,
              );
              return (
                !!img &&
                img.hasAttribute("src") &&
                img.complete &&
                img.naturalWidth === 0
              );
            }, other(shift)),
          )
          .toBe(true);
        await page.locator(".shift-toggle").click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-time",
          other(shift),
        );
        await expectPalette(page, shift);
        await expect(page.locator(".portrait-stack")).toHaveAttribute(
          "data-hold",
          shift,
        );
        await page.locator(".shift-toggle").click();
        await expectPalette(page, shift);
        await expect(page.locator(".portrait-stack")).not.toHaveAttribute(
          "data-hold",
          /.*/,
        );
        await page.locator(".shift-toggle").click();
        await expectPalette(page, shift);
        await expect(page.locator(".portrait-stack")).toHaveAttribute(
          "data-hold",
          shift,
        );
      });
    });
  }

  test.describe(`${route} portrait without JavaScript`, () => {
    test.use({ javaScriptEnabled: false });
    test("downloads and displays only the night palette", async ({ page }) => {
      const requested: string[] = [];
      page.on("request", (req) => {
        if (portraitRequests.test(req.url())) requested.push(req.url());
      });
      await page.goto(`${route}?shift=day`);
      await expect(page.locator(".portrait-stack noscript img")).toBeVisible();
      // requestAnimationFrame never fires with scripting disabled. Inspect the
      // rendered fallback directly while preserving the one-ready-palette check.
      await expect
        .poll(() =>
          page.evaluate(() =>
            Array.from(
              document.querySelectorAll<HTMLElement>(".portrait-stack picture"),
            )
              .filter((p) => getComputedStyle(p).display !== "none")
              .map((p) => {
                const img = p.querySelector("img");
                return {
                  shift: p.classList.contains("portrait-day") ? "day" : "night",
                  ready: !!img && img.complete && img.naturalWidth > 0,
                };
              }),
          ),
        )
        .toEqual([{ shift: "night", ready: true }]);
      if (await page.locator("[data-portrait-rig]").count()) {
        await expect(page.locator("[data-portrait-rig]")).toBeHidden();
      }
      expect(requested.length).toBeGreaterThan(0);
      expect(requested.every((url) => !isDayFile(url))).toBe(true);
    });
  });
}
