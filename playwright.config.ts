import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  use: {
    baseURL: "http://localhost:4321",
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
  ],
  webServer: {
    command: process.env.CI
      ? "pnpm build && node scripts/static-preview.mjs"
      : "pnpm dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
