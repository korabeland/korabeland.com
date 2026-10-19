#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ColophonStatsData } from "../src/lib/colophon-stats";
import { isValidColophonStats } from "../src/lib/colophon-stats";
import {
  fetchPullRequestStats,
  readGitCommitStats,
} from "./colophon-stats-fetch";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "src/content/trail-register");
const outFile = resolve(outDir, "commits.json");
const seedFile = resolve(outDir, "commits.seed.json");
const statsOutFile = resolve(outDir, "stats.json");
const statsSeedFile = resolve(outDir, "stats.seed.json");

interface TrailEntry {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
}

const FIELD_SEP = "\x1f";
const COMMIT_COUNT = 14;

function readGitLog(): TrailEntry[] | null {
  try {
    const stdout = execFileSync(
      "git",
      [
        "log",
        `-n${COMMIT_COUNT}`,
        `--format=%H${FIELD_SEP}%s${FIELD_SEP}%an${FIELD_SEP}%aI`,
      ],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const lines = stdout.split("\n").filter(Boolean);
    if (lines.length === 0) return null;
    const entries: TrailEntry[] = [];
    for (const line of lines) {
      const parts = line.split(FIELD_SEP);
      // Each line must be exactly the four fields we asked git to format.
      // A malformed line means the log is untrustworthy — fall back to seed.
      if (parts.length !== 4) return null;
      const [sha, subject, author, date] = parts;
      entries.push({ sha, shortSha: sha.slice(0, 7), subject, author, date });
    }
    return entries;
  } catch {
    return null;
  }
}

function fallbackCommitsToSeed(): void {
  if (!existsSync(seedFile)) {
    throw new Error(
      `gen-trail-register: git log unavailable and no seed at ${seedFile}`,
    );
  }
  copyFileSync(seedFile, outFile);
  console.log(`gen-trail-register: copied seed → ${outFile}`);
}

function fallbackStatsToSeed(): void {
  if (!existsSync(statsSeedFile)) {
    throw new Error(
      `gen-trail-register: colophon stats unavailable and no seed at ${statsSeedFile}`,
    );
  }
  copyFileSync(statsSeedFile, statsOutFile);
  console.log(`gen-trail-register: copied stats seed → ${statsOutFile}`);
}

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

function readStatsSeed(): ColophonStatsData | null {
  if (!existsSync(statsSeedFile)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(statsSeedFile, "utf8"));
    return isValidColophonStats(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function generateStats(): Promise<void> {
  // Under Playwright (`TEST_CAPTURE=1`), `astro dev` serves `stats.seed.json`
  // directly; skip the live GitHub fetch so browser test startup stays offline
  // and deterministic.
  if (process.env.TEST_CAPTURE === "1") {
    fallbackStatsToSeed();
    return;
  }

  const seed = readStatsSeed();
  const gitStats = readGitCommitStats(repoRoot);
  const prStats = await fetchPullRequestStats(resolveToken());

  if (!gitStats && !prStats) {
    fallbackStatsToSeed();
    return;
  }

  const pullRequests = prStats ?? seed?.pullRequests;
  const commits = gitStats ?? seed?.commits;
  if (!pullRequests || !commits) {
    fallbackStatsToSeed();
    return;
  }

  const payload: ColophonStatsData = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "live",
    pullRequests,
    commits,
  };

  if (!isValidColophonStats(payload)) {
    fallbackStatsToSeed();
    return;
  }

  writeFileSync(statsOutFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `gen-trail-register: wrote colophon stats (${payload.pullRequests.mergedCount} merged PRs, ${payload.commits.totalCommits} commits) → ${statsOutFile}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  // Accept whatever real git log we can get: on Vercel's shallow clone (~depth
  // 10) the log returns fewer than COMMIT_COUNT entries, but those are the real
  // latest commits and must win over the committed seed (whose newest entry
  // freezes at build-of-seed time). Only fall back when git gives us nothing.
  const entries = readGitLog();
  if (entries === null || entries.length === 0) {
    fallbackCommitsToSeed();
  } else {
    writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    console.log(
      `gen-trail-register: wrote ${entries.length} commits → ${outFile}`,
    );
  }

  await generateStats();
}

main().catch((err) => {
  console.warn(
    `gen-trail-register: unexpected error: ${(err as Error).message}`,
  );
  try {
    if (!existsSync(outFile)) fallbackCommitsToSeed();
    fallbackStatsToSeed();
  } catch (seedErr) {
    console.error((seedErr as Error).message);
    process.exit(1);
  }
});
