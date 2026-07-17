import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "@chromatic-com/playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  postRoutesSync,
  projectRoutesSync,
  staticRoutes,
} from "../lib/collection-routes";

// `pnpm reseed:visual` points this at a gitignored staging dir so a reseed
// regenerates every baseline through this exact capture path WITHOUT touching
// the committed set — promotion into tests/visual/baselines/ is a separate,
// reviewed step (see scripts/reseed-visual.mjs). Unset in normal runs.
const BASELINE_DIR = process.env.VISUAL_BASELINE_DIR
  ? resolve(process.env.VISUAL_BASELINE_DIR)
  : join(process.cwd(), "tests/visual/baselines");
const DIFF_DIR = join(process.cwd(), "tests/visual/diffs");
const DIFF_THRESHOLD = 0.005;

function ensureDirs() {
  for (const dir of [BASELINE_DIR, DIFF_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

// Newly enumerated project/post routes with no baseline yet auto-seed on
// first local run (see the !existsSync(baselinePath) branch below); CI skips
// the pixelmatch diff entirely (see the process.env.CI branch) and relies on
// Chromatic instead, so a missing baseline there is a non-issue. Sync (not
// the async reader-based helper): Playwright transforms spec files to CJS,
// where a top-level `await` throws at collect time.
const ROUTES = [
  ...staticRoutes,
  ...projectRoutesSync().map((entry) => entry.path),
  ...postRoutesSync().map((entry) => entry.path),
];

for (const route of ROUTES) {
  test(`screenshot: ${route}`, async ({ page }, testInfo) => {
    await page.goto(route);
    // Deterministic readiness: BaseLayout renders <main id="main"> on every
    // route, so waiting for it is stable — unlike networkidle, which flakes on
    // background revalidation and font swaps.
    await page.locator("main#main").waitFor({ state: "visible" });

    // In CI the pixelmatch baselines are untrustworthy — they're
    // macOS-generated and Linux renders differently, so a local diff there only
    // ever auto-seeds and passes (cost, no signal). Chromatic archives this same
    // run and is the real cross-environment gate on PRs, so skip the local diff
    // and never auto-seed in CI.
    if (process.env.CI) return;

    ensureDirs();
    const viewport = testInfo.project.name;
    const slug =
      route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-/, "");
    const name = `${slug}_${viewport}.png`;

    const screenshot = await page.screenshot({ fullPage: true });
    const baselinePath = join(BASELINE_DIR, name);

    if (!existsSync(baselinePath)) {
      writeFileSync(baselinePath, screenshot);
      return;
    }

    const baseline = PNG.sync.read(readFileSync(baselinePath));
    const current = PNG.sync.read(Buffer.from(screenshot));
    const { width: w, height: h } = baseline;
    // pixelmatch throws an opaque "Image sizes do not match" if a layout change
    // altered the full-page dimensions; surface that as an actionable message.
    if (current.width !== w || current.height !== h) {
      throw new Error(
        `Baseline size mismatch on ${route} @ ${viewport}px: baseline is ` +
          `${w}×${h}, current render is ${current.width}×${current.height}. ` +
          `A layout change resized the page — delete the baseline to re-seed.`,
      );
    }
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
