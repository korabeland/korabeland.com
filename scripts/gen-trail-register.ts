#!/usr/bin/env tsx
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "src/content/trail-register");
const outFile = resolve(outDir, "commits.json");
const seedFile = resolve(outDir, "commits.seed.json");

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

function fallbackToSeed(): void {
  if (!existsSync(seedFile)) {
    throw new Error(
      `gen-trail-register: git log unavailable and no seed at ${seedFile}`,
    );
  }
  copyFileSync(seedFile, outFile);
  console.log(`gen-trail-register: copied seed → ${outFile}`);
}

mkdirSync(outDir, { recursive: true });

// Accept whatever real git log we can get: on Vercel's shallow clone (~depth
// 10) the log returns fewer than COMMIT_COUNT entries, but those are the real
// latest commits and must win over the committed seed (whose newest entry
// freezes at build-of-seed time). Only fall back when git gives us nothing.
const entries = readGitLog();
if (entries === null || entries.length === 0) {
  fallbackToSeed();
} else {
  writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  console.log(
    `gen-trail-register: wrote ${entries.length} commits → ${outFile}`,
  );
}
