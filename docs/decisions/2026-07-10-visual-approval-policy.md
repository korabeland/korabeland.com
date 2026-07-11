# ADR: Visual approval policy — blocking Chromatic, advisory local baselines

**Date:** 2026-07-10 · **Status:** accepted (amended 2026-07-11 twice) · **Origin:** [site health remediation](../plans/2026-07-10-001-fix-site-health-remediation-plan.md) (owner-approved gate decision)

## Decision

**Chromatic is the single authoritative visual approval mechanism.** The
**Chromatic GitHub App's `UI Tests` commit status is the required check**: an
unapproved visual diff holds it red and blocks the merge; approving the diff
in the Chromatic web UI flips it green with **no CI re-run**. Chromatic renders
in its own cloud, so the baseline is platform-independent by construction.

**Amendment 2026-07-11 (a) — the gate moved out of `verify-all` into its own
CI job.** Originally the Chromatic step ran inside `verify-all`, so every
approval (and every Chromatic-side outage) cost a full ~9-minute suite re-run
— a Capture Cloud incident on 2026-07-10 blocked a fully-approved PR this way.
The publish step moved to a dedicated `chromatic` job that consumes the
Playwright page archives via artifact from `verify-all`, so an outage can't
hold the rest of CI hostage.

**Amendment 2026-07-11 (b) — the App's `UI Tests` status is the required
check; the CLI runs `--exit-zero-on-changes`.** The Chromatic GitHub App was
installed on the repo (verified 2026-07-11 — a `Chromatic.com` check-suite now
registers on new commits, absent before install). Its `UI Tests` status is now
the required branch-protection check in place of the CI `chromatic` job's exit
code. The CI job therefore only *publishes* the build: its `npx chromatic
--playwright` runs with `--exit-zero-on-changes` so visual diffs don't fail the
job (the App holds the block), while a genuine publish failure still exits
non-zero. This is what makes UI approval flip the gate green without any CI
re-run — the goal that motivated amendment (a). `--exit-zero-on-changes` is now
legitimate *because* a separate required status carries the block; it must not
be added while the App's status is not required, as that would remove the only
gate.

The local pixelmatch harness (`tests/visual/screenshot.test.ts` +
`tests/visual/baselines/`) is a **fast advisory signal for local development
only**. Its failure is useful information; it is not the release gate.

## Rules

1. **Never delete, suppress, or blind-reseed a baseline to make a failing
   check pass.** Reseeding requires visually reviewing every changed render
   first — a prior blind reseed baked a real regression in as truth.
2. A missing `CHROMATIC_PROJECT_TOKEN` on a PR **fails the publish job**
   rather than skipping it — no publish means the App never posts `UI Tests`,
   so the required check stays red (fail-closed either way). Known
   consequence: fork PRs (which never receive repo secrets) cannot pass —
   accepted while the repo is solo-maintained.
3. Local baselines are seeded on this platform (macOS) and carry known noise
   near the 0.5% pixelmatch threshold, plus environmental drift on content
   that tracks git state (the colophon build log changes with every commit).
   Verify a diff visually once; do not loop chasing a deterministic local
   green — Chromatic is the arbiter.
4. The screenshot route set is collection-driven (`tests/lib/collection-routes.ts`);
   a new published project or post is covered without a spec edit, and
   `tests/coverage-sync.test.ts` fails if enumeration drifts from disk.

## Context

Before this decision the repo had two half-gates: local pixelmatch baselines
(35 of 117 checks failing, stale since a portrait refresh) and Chromatic
running with `--exit-zero-on-changes` (never blocking). A PR touching a
covered page could merge with no visual approval of any kind.

The 2026-07-10 reseed that accompanied this ADR reviewed all 60 baselines and
caught a real bug before accepting them: the global reduced-motion override
zeroed animation-duration but not animation-delay, leaving stagger-revealed
ledger rows invisible to reduced-motion visitors during the delay window (and
making screenshots nondeterministic). Fixed in `src/styles/global.css`.
