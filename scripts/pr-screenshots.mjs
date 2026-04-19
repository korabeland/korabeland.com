#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
// Takes PR preview screenshots: 3 routes × 4 viewports → OUTPUT_DIR
// Usage: node scripts/pr-screenshots.mjs <output-dir>
import { chromium } from "@playwright/test";

const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/colophon", slug: "colophon" },
  { path: "/off-trail", slug: "off-trail" },
];

const VIEWPORTS = [
  { width: 375, height: 812, name: "375" },
  { width: 768, height: 1024, name: "768" },
  { width: 1280, height: 800, name: "1280" },
  { width: 1920, height: 1080, name: "1920" },
];

const BASE_URL = process.env.BASE_URL || "http://localhost:4321";
const OUTPUT_DIR = process.argv[2] || "public/pr-previews/screenshots";

mkdirSync(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();

for (const { width, height, name } of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  for (const { path, slug } of ROUTES) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
    const filepath = join(OUTPUT_DIR, `${slug}-${name}.png`);
    await page.screenshot({ path: filepath });
    process.stderr.write(`  ${slug} @ ${name}px → ${filepath}\n`);
  }
  await ctx.close();
}

await browser.close();
