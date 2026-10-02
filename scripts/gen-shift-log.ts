#!/usr/bin/env tsx
// Generates src/content/shift-log/contributions.json (the R9 shift-log grid data)
// from the GitHub GraphQL contribution calendar. Mirrors gen-trail-register's
// resilience contract: on ANY failure (missing token, non-200, timeout, shape mismatch)
// it copies the committed seed and exits 0, so a failed fetch never fails the
// build. Chained into `prebuild` only (NOT `predev`): Playwright's webServer
// runs `pnpm dev`, and a live fetch there would regenerate the JSON from real
// data on every test run, drifting colophon baselines daily. Dev and tests
// deliberately serve the committed seed via the loader's fallback.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCalendar } from "./shift-log-fetch";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "src/content/shift-log");
const outFile = resolve(outDir, "contributions.json");
const seedFile = resolve(outDir, "contributions.seed.json");

/**
 * tsx does NOT auto-load .env.local (only Astro/Vite does), so a local
 * with-token run needs a manual parse. Vercel's real process.env still wins.
 */
function resolveToken(): string | null {
  if (process.env.GITHUB_CONTRIB_TOKEN) return process.env.GITHUB_CONTRIB_TOKEN;
  const envLocal = resolve(repoRoot, ".env.local");
  if (!existsSync(envLocal)) return null;
  try {
    for (const line of readFileSync(envLocal, "utf8").split("\n")) {
      const match = line.match(/^\s*GITHUB_CONTRIB_TOKEN\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to null
  }
  return null;
}

function fallbackToSeed(): void {
  if (!existsSync(seedFile)) {
    throw new Error(
      `gen-shift-log: fetch unavailable and no seed at ${seedFile}`,
    );
  }
  copyFileSync(seedFile, outFile);
  console.warn(`gen-shift-log: SEED FALLBACK — copied seed → ${outFile}`);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  const token = resolveToken();
  if (!token) {
    console.warn(
      "gen-shift-log: no GITHUB_CONTRIB_TOKEN (env or .env.local); using seed",
    );
    fallbackToSeed();
    return;
  }

  const calendar = await fetchCalendar(token);
  if (!calendar) {
    fallbackToSeed();
    return;
  }

  const payload = {
    fetchedAt: new Date().toISOString().slice(0, 10),
    source: "api" as const,
    total: calendar.total,
    weeks: calendar.weeks,
  };
  writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `gen-shift-log: LIVE — wrote ${calendar.total} contributions, ${calendar.weeks.length} weeks → ${outFile}`,
  );
}

main().catch((err) => {
  // Last-resort guard: even an unexpected throw must not fail the build if a
  // seed exists. Only a genuinely missing seed is fatal.
  console.warn(`gen-shift-log: unexpected error: ${(err as Error).message}`);
  try {
    fallbackToSeed();
  } catch (seedErr) {
    console.error((seedErr as Error).message);
    process.exit(1);
  }
});
