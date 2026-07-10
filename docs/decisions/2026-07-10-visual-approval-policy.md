# ADR: Visual approval policy — blocking Chromatic, advisory local baselines

**Date:** 2026-07-10 · **Status:** accepted · **Origin:** [site health remediation](../plans/2026-07-10-001-fix-site-health-remediation-plan.md) (owner-approved gate decision)

## Decision

**Chromatic is the single authoritative visual approval mechanism.** The CI
step runs `npx chromatic --playwright` with no `--exit-zero-on-changes`: an
unapproved visual diff fails the required `verify-all` check and blocks the
merge. A deliberate visual change is approved in the Chromatic web UI, which
turns the check green on re-run. Chromatic renders in its own cloud, so the
baseline is platform-independent by construction.

The local pixelmatch harness (`tests/visual/screenshot.test.ts` +
`tests/visual/baselines/`) is a **fast advisory signal for local development
only**. Its failure is useful information; it is not the release gate.

## Rules

1. **Never delete, suppress, or blind-reseed a baseline to make a failing
   check pass.** Reseeding requires visually reviewing every changed render
   first — a prior blind reseed baked a real regression in as truth.
2. A missing `CHROMATIC_PROJECT_TOKEN` on a PR **fails the job** rather than
   skipping the step. Known consequence: fork PRs (which never receive repo
   secrets) cannot pass — accepted while the repo is solo-maintained.
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
