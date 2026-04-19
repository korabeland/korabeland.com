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
    return lines.map((line) => {
      const [sha, subject, author, date] = line.split(FIELD_SEP);
      return {
        sha,
        shortSha: sha.slice(0, 7),
        subject,
        author,
        date,
      };
    });
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

const entries = readGitLog();
if (entries === null || entries.length < COMMIT_COUNT) {
  fallbackToSeed();
} else {
  writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  console.log(
    `gen-trail-register: wrote ${entries.length} commits → ${outFile}`,
  );
}
