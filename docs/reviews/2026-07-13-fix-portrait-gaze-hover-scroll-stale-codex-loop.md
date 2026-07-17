# Codex Review Loop — fix/portrait-gaze-hover-scroll-stale

- **Date:** 2026-07-13
- **Base:** origin/main (73eae46)
- **Head at completion:** a2a4762 (this summary folded in by amend)
- **Passes run:** 2
- **Outcome:** stopped: stall (pass 2's sole finding is an escalation; re-review would only resurface it)

## Applied by the loop

Findings codex raised that Claude applied and that survived the fast gate (`pnpm verify && pnpm test`, both green).

- [simplification] `src/components/Portrait/index.astro`:308 — Collapsed the redundant `lookTarget` state into `lookEl`. After the bug fix, `lookTarget` was purely derived from `lookEl` inside `sync()` and otherwise used only as a hover-presence flag, so the two duplicated state. `lookEl` is now the single source: `sync()` computes the glance target inline from its live centre (`centerOf(lookEl)`), and the hover-depth, relaunch, and micro-drift branches read `lookEl` directly. Behaviour-preserving — re-verified with a headless-Chromium probe: the glance still tracks a hovered link across a scroll (target lag 0px).

## Escalated to Korab (NOT applied)

- [quality/low] `src/components/Portrait/index.astro`:341 — codex suggested: add a desktop, motion-enabled Playwright regression test that hovers a `[data-gaze-target]` control, shifts its viewport position via scroll/resize, and asserts the pupil transform re-aims at the new centre. — escalated because: this conflicts with a deliberate, documented repo convention. `tests/e2e/portrait-gaze.spec.ts` states the live gaze is *intentionally* not asserted in CI ("Headed-browser judgement covers the live motion"), and `playwright.config.ts` pins `reducedMotion: "reduce"` for determinism. A robust implementation would need either permanent `window.__gaze` instrumentation in shipped code or assertions on ~1px sub-pixel pupil transforms — both flaky, both against the maintainers' stated approach. The fix's behaviour *was* verified out-of-band with a throwaway headless probe (lag 6px → 0px). Whether to break the no-live-gaze-in-CI convention is Korab's call.

## Reverted

None.

## Verify

- Final `pnpm verify:all`: **fail — but entirely on pre-existing `origin/main` drift, not this branch.** 24 visual failures, all on content routes changed by the admin-pushed case-study series (`4e4f764`, `08b27a9`): ~21 baseline size mismatches (`/`, `/work`, `/work/{ai-sms-pilot,call-tier-discipline,chat-capture-gap,lead-scoring}`) and 1 stale SEO description fragment (`seo.spec.ts` for `/work/lead-scoring`). Proven independent of this change: with the fix stashed, `screenshot: /` fails byte-identically on clean `origin/main` (`baseline 375×2984 vs current 375×3013`). Unrelated routes (`/lab`, `/about`, `/notes`, `/colophon`, `/off-trail`) all pass. This branch's own surface is green: `pnpm verify` (0 errors), `pnpm test` (276 passed), the gated-off `portrait-gaze.spec.ts` (both cases), and the `e2e` project run alone (66/66).
- **Blocker for CI merge (pre-existing, tracked):** the drifted visual baselines + the stale `/work/lead-scoring` SEO fragment need a reseed/update. This is a follow-up from the case-study content push, not introduced here.
