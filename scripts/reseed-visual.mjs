#!/usr/bin/env node
// reseed-visual.mjs — staged, reviewable, atomic reseed of the local pixelmatch
// baselines (tests/visual/baselines/). Replaces "delete the baseline, let the
// test re-seed it" so a reseed can never blind-overwrite a baseline before every
// diff has been reviewed. See docs/plans/2026-07-13-workflow-optimization-plan.md
// (Finding 5) and docs/decisions/2026-07-10-visual-approval-policy.md (Rule 1).
//
//   pnpm reseed:visual            generate fresh PNGs into a gitignored staging
//                                 dir (baselines untouched) + print a per-file
//                                 diff report to review.
//   pnpm reseed:visual --promote  after review, move approved PNGs into the
//                                 committed baselines by rename (no rm, no
//                                 blind delete). --force skips the HEAD-drift guard.
//
// Chromatic stays the blocking gate; these local baselines are advisory only.

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const ROOT = process.cwd();
const BASELINE_DIR = join(ROOT, "tests/visual/baselines");
const PENDING_DIR = join(ROOT, "tests/visual/.reseed-pending");
const PENDING_DIFF_DIR = join(PENDING_DIR, "diffs");
const META_PATH = join(PENDING_DIR, ".reseed-meta.json");

// Match the harness (tests/visual/screenshot.test.ts) exactly so a promoted
// baseline immediately passes the real test.
const DIFF_THRESHOLD = 0.005;
const PIXELMATCH_THRESHOLD = 0.1;
const SCREENSHOT_PROJECTS = ["375", "768", "1280", "1920"];

const argv = new Set(process.argv.slice(2));
const PROMOTE = argv.has("--promote");
const FORCE = argv.has("--force");

const pngsIn = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : [];
const headSha = () => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
};
const die = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

// ── promote ────────────────────────────────────────────────────────────────
if (PROMOTE) {
  const staged = pngsIn(PENDING_DIR);
  if (!existsSync(META_PATH) || staged.length === 0) {
    die("nothing staged to promote — run `pnpm reseed:visual` first.");
  }
  const meta = JSON.parse(readFileSync(META_PATH, "utf8"));
  const now = headSha();
  if (meta.head !== now && !FORCE) {
    die(
      `staging was generated from ${meta.head} but HEAD is now ${now}.\n` +
        "  The renders may be stale. Re-run `pnpm reseed:visual`, or pass --force to promote anyway.",
    );
  }
  // Promote each approved PNG into the committed baselines. Each rename is a
  // per-file atomic overwrite (never an rm); the set is not transactional, but
  // the baselines are git-tracked, so an interrupted promote leaves at worst a
  // partially-updated set that `git checkout -- tests/visual/baselines` fully
  // restores — nothing is lost.
  let promoted = 0;
  for (const name of staged) {
    renameSync(join(PENDING_DIR, name), join(BASELINE_DIR, name));
    promoted++;
  }
  rmSync(PENDING_DIR, { recursive: true, force: true });
  console.log(
    `\n✓ Promoted ${promoted} baseline(s) into tests/visual/baselines/.`,
  );
  console.log(
    "  Review is your responsibility (ADR Rule 1); Chromatic remains the blocking gate.\n" +
      "  Undo before committing with: git checkout -- tests/visual/baselines",
  );
  process.exit(0);
}

// ── generate ─────────────────────────────────────────────────────────────────
// Start from a clean staging dir so every route auto-seeds fresh through the
// harness's own capture path (empty baseline dir → the test writes the current
// screenshot and returns). The committed baselines are never touched here.
rmSync(PENDING_DIR, { recursive: true, force: true });
mkdirSync(PENDING_DIR, { recursive: true });

console.log(
  "▶ Regenerating baselines into tests/visual/.reseed-pending/ (baselines untouched)…",
);
const run = spawnSync(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    ...SCREENSHOT_PROJECTS.map((p) => `--project=${p}`),
  ],
  {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, VISUAL_BASELINE_DIR: PENDING_DIR },
  },
);

// ── completeness gate: partial output can never be promoted ──────────────────
if (run.status !== 0) {
  die(
    `the screenshot run exited ${run.status}. Baselines untouched, staging left for inspection at\n` +
      `  ${PENDING_DIR}`,
  );
}
const baselineNames = pngsIn(BASELINE_DIR);
const pendingNames = new Set(pngsIn(PENDING_DIR));
const missing = baselineNames.filter((n) => !pendingNames.has(n));
if (missing.length > 0) {
  die(
    `generation is incomplete — ${missing.length} existing baseline(s) have no regenerated counterpart:\n` +
      missing.map((n) => `    ${n}`).join("\n") +
      "\n  (an aborted run, or a stale baseline for a route no longer rendered). Baselines untouched.",
  );
}

// ── diff report: reviewer must look at every changed baseline ────────────────
mkdirSync(PENDING_DIFF_DIR, { recursive: true });
const rows = [];
for (const name of pngsIn(PENDING_DIR)) {
  const pendingPath = join(PENDING_DIR, name);
  const baselinePath = join(BASELINE_DIR, name);
  if (!existsSync(baselinePath)) {
    rows.push({ name, status: "new", ratio: Number.POSITIVE_INFINITY });
    continue;
  }
  const a = PNG.sync.read(readFileSync(baselinePath));
  const b = PNG.sync.read(readFileSync(pendingPath));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push({ name, status: "resized", ratio: Number.POSITIVE_INFINITY });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatch = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: PIXELMATCH_THRESHOLD,
  });
  const ratio = mismatch / (a.width * a.height);
  if (mismatch === 0) {
    rows.push({ name, status: "identical", ratio });
    continue;
  }
  // Any nonzero difference gets an overlay so a reviewer can inspect it before
  // promoting — promote overwrites every render, so "sub-threshold" must not mean
  // "unreviewable". `changed` clears the test's regression threshold; `noise` is
  // below it (macOS pixel jitter) but is still shown, not silently accepted.
  writeFileSync(join(PENDING_DIFF_DIR, `diff_${name}`), PNG.sync.write(diff));
  rows.push({
    name,
    status: ratio > DIFF_THRESHOLD ? "changed" : "noise",
    ratio,
  });
}

rows.sort((x, y) => y.ratio - x.ratio);
const changed = rows.filter((r) => r.status === "changed");
const noise = rows.filter((r) => r.status === "noise");
const resized = rows.filter((r) => r.status === "resized");
const added = rows.filter((r) => r.status === "new");
const identical = rows.filter((r) => r.status === "identical");

console.log(
  "\n── Reseed diff report ─────────────────────────────────────────",
);
for (const r of rows) {
  const pct = Number.isFinite(r.ratio)
    ? `${(r.ratio * 100).toFixed(3)}%`.padStart(9)
    : "     —   ";
  console.log(`  ${r.status.padEnd(10)} ${pct}  ${r.name}`);
}
console.log("───────────────────────────────────────────────────────────────");
console.log(
  `  ${rows.length} render(s): ${changed.length} changed, ${noise.length} noise ` +
    `(sub-${DIFF_THRESHOLD * 100}%), ${resized.length} resized, ${added.length} new, ` +
    `${identical.length} identical.`,
);
if (changed.length + noise.length > 0) {
  console.log(
    `  Diff overlays for every render that differs at all: ${PENDING_DIFF_DIR}`,
  );
}

writeFileSync(
  META_PATH,
  `${JSON.stringify(
    {
      head: headSha(),
      generatedAt: new Date().toISOString(),
      total: rows.length,
      changed: changed.map((r) => r.name),
      noise: noise.map((r) => r.name),
      resized: resized.map((r) => r.name),
      new: added.map((r) => r.name),
    },
    null,
    2,
  )}\n`,
);

console.log(
  "\n  Review every render that differs at all — changed, noise, resized, new —\n" +
    "  using the overlays above and the side-by-side (committed baseline in\n" +
    "  tests/visual/baselines/ vs the staged PNG in tests/visual/.reseed-pending/).\n" +
    "  --promote overwrites every render, so a diff you don't inspect ships unreviewed.\n" +
    "  When they are all intended, promote with:  pnpm reseed:visual --promote\n",
);
