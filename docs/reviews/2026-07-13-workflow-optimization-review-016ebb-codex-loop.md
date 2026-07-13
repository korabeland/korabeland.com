# Codex Review Loop — claude/workflow-optimization-review-016ebb

- **Date:** 2026-07-13
- **Base:** origin/main
- **Head at completion:** 9576589b52a2cb3441c48e1a1225fad5668a2835
- **Passes run:** 3 (converged clean on pass 3)
- **Outcome:** clean

## Applied by the loop

Behaviour-preserving fixes applied and re-verified (verify + vitest green after each pass):

- [bug] `.claude/hooks/worktree-bootstrap.sh` — skip with a fail-soft warning when no `timeout`/`gtimeout` binary is on PATH, instead of running `pnpm install` unbounded (which could hang SessionStart, contradicting the bounded contract).
- [bug] `.claude/skills/codex-review-loop/scripts/pr-gate.sh` — docs-only classification now takes its merge-base from `FETCH_HEAD` (the just-fetched tip) rather than the possibly-stale `refs/remotes/origin/main`, strengthening the fail-closed guarantee.
- [bug] `tests/e2e/worktree-isolation.spec.ts` — assert the served worktree `root` as well as `head`, so a foreign dev server sitting at the same commit is still caught.
- [bug] `scripts/reseed-visual.mjs` — emit a diff overlay and an honest label (identical / noise / changed) for every render that differs at all, so a sub-threshold change can no longer be promoted unreviewed; corrected the promote comment to describe per-file-atomic + git-recoverable rather than set-atomic.

## Escalated to Korab (NOT applied)

- [quality/medium] `scripts/reseed-visual.mjs` (promote loop) — codex twice suggested a "transactional" directory-swap promote for set-level atomicity. **Declined:** the plan's design (Finding 5) is a per-file rename overwrite + git-tracked rollback, which already makes any interrupted/partial promote fully recoverable via `git checkout -- tests/visual/baselines`. A directory swap adds real complexity (excluding `diffs/`/meta, swap-recovery) for no gain over git-based recovery. Did not reappear on the clean pass 3.

## Reverted

None.

## Verify

- `pnpm verify` + `pnpm test` (276 vitest) green after each applied pass.
- `CI=1 pnpm verify:all` (the gate CI enforces; local pixelmatch is advisory per docs/decisions/2026-07-10-visual-approval-policy.md) is green **for this branch's code**. Two inherited-from-`main` failures are unrelated to this diff and out of scope: stale local visual baselines on `/`,`/work`,`/work/*` (CI skips the local diff; Chromatic is the gate), and a stale `seo.spec.ts` fragment for `/work/lead-scoring` (introduced by `08b27a9`; being fixed separately).
