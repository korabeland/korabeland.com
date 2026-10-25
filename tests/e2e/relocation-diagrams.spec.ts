import { expect, test } from "@playwright/test";

const DIAGRAMS = [
  "system-overview",
  "ripple-effects",
  "first-system",
  "weekly-agenda",
  "redesigned-system",
] as const;
const MAX_IMAGE_BYTES = 200 * 1024;
const diagramImagePath =
  /\/lab\/relocation-playbook\/diagrams\/[^/]+\.gen\.(?:680|1360)\.(?:avif|webp)$/;

test.describe("Relocation Playbook diagrams", () => {
  test.use({ deviceScaleFactor: 2 });

  test("follows the active shift toggle and serves each image within budget", async ({
    page,
  }) => {
    const delivered = new Map<string, number>();
    page.on("requestfinished", async (request) => {
      if (!diagramImagePath.test(new URL(request.url()).pathname)) return;
      const response = await request.response();
      if (response && response.status() >= 200 && response.status() < 300) {
        delivered.set(
          new URL(request.url()).pathname,
          (await response.body()).length,
        );
      }
    });

    await page.goto("/lab/relocation-playbook?shift=day");
    await expect(page.locator("html")).toHaveAttribute("data-time", "day");

    const dayAlts: string[] = [];
    for (const name of DIAGRAMS) {
      const figure = page.locator(`[data-diagram="${name}"]`);
      await figure.scrollIntoViewIfNeeded();
      const image = figure.locator("picture.diagram-day img");
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
        .toContain(`/diagrams/${name}-day.gen.1360.avif`);
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
      dayAlts.push((await image.getAttribute("alt")) ?? "");
    }

    await page.locator(".shift-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-time", "night");

    const nightAlts: string[] = [];
    for (const name of DIAGRAMS) {
      const figure = page.locator(`[data-diagram="${name}"]`);
      await figure.scrollIntoViewIfNeeded();
      const image = figure.locator("picture.diagram-night img");
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc))
        .toContain(`/diagrams/${name}-night.gen.1360.avif`);
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true);
      nightAlts.push((await image.getAttribute("alt")) ?? "");
    }

    expect(dayAlts).toEqual(nightAlts);
    expect(dayAlts.every((alt) => alt.length > 0)).toBe(true);
    await expect.poll(() => delivered.size).toBe(DIAGRAMS.length * 2);
    expect([...delivered.keys()].sort()).toEqual(
      DIAGRAMS.flatMap((name) => [
        `/lab/relocation-playbook/diagrams/${name}-day.gen.1360.avif`,
        `/lab/relocation-playbook/diagrams/${name}-night.gen.1360.avif`,
      ]).sort(),
    );
    for (const [path, bytes] of delivered) {
      expect(
        bytes,
        `${path} exceeded the 200 KB image budget`,
      ).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    }
  });
});
