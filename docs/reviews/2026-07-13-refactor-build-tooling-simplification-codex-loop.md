# Codex Review Loop — refactor/build-tooling-simplification

- **Date:** 2026-07-13
- **Base:** origin/main (`2e1ebf6`)
- **Head at completion:** `99c2a44` (code) + this summary commit
- **Passes run:** 2
- **Outcome:** stopped — both codex passes returned findings **only on pre-existing code outside this branch's diff** (the `src/components/Portrait/index.astro` gaze rig). Nothing codex raised was in-scope to apply; continuing would keep surfacing out-of-diff observations, so the loop stopped and escalated them.

## Applied by the loop

None from codex — both codex findings are out of this branch's scope (see below).

Separately, a **Tier-1 (Claude) code-review** pass over the diff found one in-scope issue and it was applied and folded into the U6 commit before the second codex pass:

- [quality] `scripts/check-base-freshness.sh` — the guard's header promises fail-soft on any config problem, but a non-numeric `STALE_BASE_THRESHOLD` override would make `[ "$BEHIND" -le "$THRESHOLD" ]` error and fall through to a *block* (with a bash "integer expression expected" error) — contradicting its own contract. Fix: validate the override and fall back to the default `10` with a warning. Covered by a new test case in `tests/base-freshness.test.ts`.

## Escalated to Korab (NOT applied)

Both are out of this branch's diff (codex reads the whole repo under its read-only sandbox and commented on pre-existing gaze-rig code from PRs #39–41). Applying either would touch the live portrait gaze rig — behaviour-changing, and a risk to the zero-baseline-churn bar this refactor is measured against (R4). They belong in their own gaze-rig PR, not here.

- [simplification/low] `src/components/Portrait/index.astro`:314 (pass 1) — codex suggested removing `lookTarget` and deriving the look target from `lookEl` in `sync()` — escalated because: out of scope (not in this branch's diff) and behaviour-changing (rewrites the gaze rig's state model, could shift the `gaze-poses` visual baseline).
- [quality/low] `src/components/Portrait/index.astro`:341 (pass 2) — codex suggested adding a motion-enabled Playwright regression test that hovers a `data-gaze-target` control and asserts the pupil re-aims after a scroll/resize — escalated because: out of scope (the gaze rig is not touched by this refactor) and adds live-motion visual coverage that is a gaze-rig concern, not a build-tooling one.

## Reverted

None.

## Verify

- Final `pnpm verify:all` on `99c2a44` (DEV_PORT=4399, fresh dev server): **green** — `verify` + `test` + `test:visual` pass with **zero baseline churn**. The `lighthouse` step can fail once on the known transient `CHROME_INTERSTITIAL_ERROR` (Chrome interstitial on the first localhost URL after the static-preview healthcheck passes) and passes clean on immediate retry — the identical environmental flake seen on the U1 baseline against unmodified `origin/main`, not a regression.
