# Codex Review Loop — claude/night-gaze-social-buttons-33fdcf

- **Date:** 2026-07-13
- **Base:** origin/main (3819331)
- **Head at completion:** (this commit)
- **Passes run:** 1
- **Outcome:** clean (no findings applied — all were false-positive or pre-existing/out-of-scope)

Note: the branch was cut from the pre-squash tuning commit `0623fd3`; PR #40 landed
that same work on main as the squash `3819331`. Rebased onto `origin/main` before
reviewing so the diff (and this PR) is exactly the two feature commits, not the
already-merged tuning.

## Applied by the loop

None. Codex raised three findings; none were safe *and* correct to apply — see below.

## Dismissed (false positive)

- [bug/high] `src/components/Portrait/index.astro`:396 — codex claimed fixation
  classification only runs on pointermove/scroll/resize, so a stationary cursor never
  re-classifies and never settles to eye contact (AE2). **False positive:** the `frame`
  loop at lines 398–404 already drives this — a `CLASSIFY_TICK_MS` (60ms) throttled
  `reeval(now)` re-evaluates the last cursor position while `TRACKING` so the dispersion
  window completes without a fresh pointer event. This is pre-existing, correct code
  (the AE2 fix from the v2 build), unchanged by this branch.

## Escalated to Korab (NOT applied)

Both are pre-existing files **outside this branch's diff** (this PR touches only
`Portrait/index.astro`, `portrait-gaze.ts`, `index.astro`, and the four home
baselines) and both fall in the "escalate, don't auto-apply" categories. Neither is a
regression introduced here; noting them as possible follow-ups, not PR blockers.

- [bug/medium] `scripts/gen-eye-rig.ts`:235 — codex suggests the rest-parity check
  compares an ideal float composite against the pristine source, so it could pass while
  the emitted WebP layers seam at rest; suggests validating against the delivered WebP
  layers composited over the delivered base. Escalated because: `scripts/gen-*.ts` is a
  data-generation file (protected/behaviour-changing) and it is not part of this change.
- [quality/medium] `tests/portrait-gaze.test.ts`:760 — codex notes the containment sweep
  asserts only that the iris *centre* stays inside a shrunken aperture, not the full
  transformed sprite footprint. Escalated because: rewriting a test's assertions is a
  behaviour-changing edit, and the file is not part of this change.

## Reverted

None.

## Verify

- `pnpm verify` (Biome + tsc + astro check): **pass** — 0 errors.
- `pnpm test` (Vitest): **pass** — 276 tests.
- Visual screenshot suite (all routes × 375/768/1280/1920): **pass** — 68, home compares
  clean against the reseeded baselines. Run on an alt-port (4322) server because port
  4321 was held by another worktree's dev server.
- e2e (surfaces + portrait-gaze gate): **pass** — 4.
- `pnpm build`: **pass** — production build Complete.
- Lighthouse (`pnpm audit`): not run locally — its static-preview server also binds 4321,
  held by the other worktree. The change has negligible perf/a11y surface (icon reorder,
  one-word caption, a pinned JS constant, a data attribute + target/rel). CI runs the full
  `verify:all` cleanly on the PR as the authoritative gate.
