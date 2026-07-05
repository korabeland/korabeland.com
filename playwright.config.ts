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
      name: "seo",
      testMatch: "**/seo.spec.ts",
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "e2e",
      testMatch: "**/routes.spec.ts",
      use: { viewport: { width: 1280, height: 800 } },
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
