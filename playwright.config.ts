import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:4321",
    // Emulate prefers-reduced-motion for every project so animation-driven
    // surfaces (breathing status dots, hero-headline rotation, metric
    // count-up) render their static end-state. This keeps screenshots
    // deterministic and makes the static-default path the tested path; the
    // animated paths are verified manually in a normal browser.
    contextOptions: { reducedMotion: "reduce" },
    // Pin the shift to night for every project by pre-seeding localStorage, so
    // the time-based default (R7) can never make screenshots/axe depend on the
    // CI clock — night is the canonical palette. The `a11y-day` project below
    // overrides this to audit the day palette; `shift.spec.ts` overrides it
    // per-test to exercise clean/day storage. Lighthouse pins via `?shift=`
    // (see .lighthouserc.json) since it runs a fresh profile with no storage.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:4321",
          localStorage: [{ name: "korab-shift", value: "night" }],
        },
      ],
    },
  },
  projects: [
    {
      name: "375",
      testMatch: "**/screenshot.test.ts",
      use: { viewport: { width: 375, height: 812 } },
    },
    {
      name: "768",
      testMatch: "**/screenshot.test.ts",
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: "1280",
      testMatch: "**/screenshot.test.ts",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "1920",
      testMatch: "**/screenshot.test.ts",
      use: { viewport: { width: 1920, height: 1080 } },
    },
    {
      name: "a11y",
      testMatch: "**/accessibility.test.ts",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      // Same axe suite, day palette. DESIGN.md §7 requires both shifts audited;
      // the global night pin leaves day unaudited without this, and a latent
      // day-token contrast failure would otherwise only surface for a visitor
      // who lands during daytime. Overrides the night storageState to day.
      name: "a11y-day",
      testMatch: "**/accessibility.test.ts",
      use: {
        viewport: { width: 1280, height: 800 },
        storageState: {
          cookies: [],
          origins: [
            {
              origin: "http://localhost:4321",
              localStorage: [{ name: "korab-shift", value: "day" }],
            },
          ],
        },
      },
    },
    {
      name: "seo",
      testMatch: "**/seo.spec.ts",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      // Widened from **/routes.spec.ts so U2's shift.spec.ts and U6's
      // provenance.spec.ts (both under tests/e2e/) actually run — the exact-file
      // glob silently skipped any new spec while CI stayed green.
      name: "e2e",
      testMatch: "**/e2e/*.spec.ts",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      // Pinned-pose visual record for the gaze v2 rig (U8). Its own project so
      // the spec runs at all — the screenshot projects match **/screenshot.test.ts
      // exactly, so this sibling would otherwise silently never execute. One
      // desktop viewport: the /dev/gaze-v2-poses harness is fixed-width per cell,
      // so more viewports add no coverage. The @chromatic-com/playwright fixture
      // archives each shift to Chromatic (the blocking visual gate).
      name: "gaze-poses",
      testMatch: "**/visual/gaze-poses.spec.ts",
      use: { viewport: { width: 1280, height: 900 } },
    },
  ],
  // Always a real dev server, in CI too: /off-trail, /404, and the
  // /projects redirects are SSR-only (live query-string reads, live
  // redirects) with no static output, so the static-preview.mjs server
  // used by Lighthouse (see .lighthouserc.json, a separate config) can't
  // serve them — it 404s routes that work fine under real SSR.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
