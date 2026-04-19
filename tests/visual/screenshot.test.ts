import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@chromatic-com/playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const BASELINE_DIR = join(process.cwd(), "tests/visual/baselines");
const DIFF_DIR = join(process.cwd(), "tests/visual/diffs");
const DIFF_THRESHOLD = 0.005;

function ensureDirs() {
  for (const dir of [BASELINE_DIR, DIFF_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

const ROUTES = ["/", "/colophon"];

for (const route of ROUTES) {
  test(`screenshot: ${route}`, async ({ page }, testInfo) => {
    ensureDirs();
    const viewport = testInfo.project.name;
    const slug =
      route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-/, "");
    const name = `${slug}_${viewport}.png`;

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const screenshot = await page.screenshot({ fullPage: true });
    const baselinePath = join(BASELINE_DIR, name);

    if (!existsSync(baselinePath)) {
      writeFileSync(baselinePath, screenshot);
      return;
    }

    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const current = PNG.sync.read(Buffer.from(screenshot));
    const { width: w, height: h } = baseline;
    const diffPng = new PNG({ width: w, height: h });

    const mismatch = pixelmatch(
      baseline.data,
      current.data,
      diffPng.data,
      w,
      h,
      {
        threshold: 0.1,
      },
    );
    const diffRatio = mismatch / (w * h);

    if (diffRatio > DIFF_THRESHOLD) {
      const diffPath = join(DIFF_DIR, `diff_${name}`);
      writeFileSync(diffPath, PNG.sync.write(diffPng));
      throw new Error(
        `Visual regression on ${route} @ ${viewport}px: ${(diffRatio * 100).toFixed(2)}% pixel diff exceeds ${DIFF_THRESHOLD * 100}% threshold. ` +
          `Diff saved to ${diffPath}. Delete the baseline to update it.`,
      );
    }
  });
}
