# Codex Review Loop — claude/review-model-routing-887893

- **Date:** 2026-07-13
- **Base:** origin/main
- **Head at completion:** (marker written against final HEAD after this summary commit)
- **Passes run:** 1
- **Outcome:** clean (no in-scope findings)

## Applied by the loop

None — codex raised no findings about lines in this branch's diff.

## Escalated to Korab (NOT applied)

- [bug/low] `src/components/Portrait/index.astro`:526 — codex suggested recomputing the
  hovered social link's center on scroll/resize (the gaze rig captures it only on
  `mouseenter`, so `lookTarget` goes stale). **Escalated because: out of scope** — this
  file is not part of this branch's diff (which touches only
  `.claude/skills/codex-review-loop/`), and codex-review.sh's own rule forbids findings
  on lines outside the diff. It is pre-existing code from the v1 portrait gaze rig
  (PR #33). Spun off as a separate background task rather than pulled into this PR; also
  flagged to check whether the v2 gaze build already addresses it.

## Reverted

None.

## Verify

This branch changes only `.claude/skills/codex-review-loop/` — shell scripts and
markdown, with no runtime, build, or rendered surface. Change-specific verification:

- `pr-gate-test.sh`: 9/9 scenarios pass (allow/deny across trailer casing, prose-mention
  non-false-positive, legacy-marker fail-closed, worktree, gate-off, stale-head).
- `bash -n` clean on `pr-gate.sh` and `pr-gate-test.sh`.
- `biome check` on the changed dir and `tsc --noEmit`: clean.

`pnpm verify:all`'s Playwright-visual and Lighthouse legs are not applicable to a
non-rendered docs/shell change and were not run in this nested worktree (which lacks the
Playwright/Lighthouse provisioning). The full `verify:all` runs remotely on the PR (a
required check), which is the proper environment for those legs.
