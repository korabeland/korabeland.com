# Codex Review Loop — claude/portrait-gaze-v2-plan-384dcc

- **Date:** 2026-07-12
- **Base:** origin/main
- **Head at completion:** (fix commit — see git log; marker records the exact SHA)
- **Passes run:** 2
- **Outcome:** stopped: stall (pass 2 re-raised two pass-1 findings verbatim plus one design-consistent non-bug; all remaining findings are settled decisions or reject-the-fix cases, not safe auto-applies)

## Applied by the loop

Findings codex raised that Claude applied and that survived the fast gate (`verify` + `test`) and a real headless-browser check.

- [bug/high] `src/components/Portrait/index.astro` — **Stationary cursor never settled to eye contact (AE2).** The fixation classifier and the face-zone dwell clock only advanced inside `reeval()`, which fired only on pointermove/scroll/resize. A cursor that stopped moving emitted no further events, so the dispersion window never completed and the gaze stayed frozen in TRACKING at the last position — it never made eye contact on a pause, the core of moment 7. Fix (driver only, SSOT reducer untouched): the rAF loop now re-classifies from the last cursor position on a 60ms throttle while TRACKING, so a held-still cursor completes the window/dwell and transitions to CONTACT. Verified in a real browser: after a stationary hold the offset develops the 0.6Hz contact micro-drift (spread 0.51px/1.2s) instead of freezing (~0). Committed as the `fix:` commit on this branch.

## Escalated to Korab (NOT applied)

Findings the loop refused to auto-apply — settled design decisions, behaviour that matches the approved spec, or a reviewer misread of a documented invariant. None is a regression; each needs (at most) a taste call.

- [bug/medium] `scripts/gen-eye-rig.ts` — codex suggested: emit rig layers per delivered width (360/720/1040) and validate parity at each width, rather than one source-resolution set validated in float space. Escalated because: **this is a settled decision, not a regression.** The plan's Open Questions deferred "per-width vs single-resolution layer emission" explicitly to the U4 proof; Korab's proof collapsed it to single-resolution after confirming clean seams at real render scale. `gen-eye-rig.ts` is also a data-generation/escalation-boundary file. The delivered-path composite is not unverified: `/dev/gaze-v2-poses` composites the actual emitted WebP layers over the delivered base and Chromatic archives it, and the composited grid was visually reviewed (no seams). Raised in both passes.
- [bug/medium] `src/components/Portrait/index.astro` — codex suggested: suppress micro-drift after a snap-reset interrupt (blur / shift toggle) so the eyes hold an exact static rest. Escalated because: **it contradicts the approved design.** In this rig "rest" is the CONTACT state (eyes on the viewer), and DESIGN.md moment 7 defines rest as having "sub-pixel drift between jumps." The interrupt snaps to that living rest; the ≤0.42px drift continuing is by design, not a freeze bug. Applying the fix would make rest dead-static. Optional taste call for Korab: keep the living rest (current) or dead-freeze the eyes on interrupt.
- [quality/medium] `tests/portrait-gaze.test.ts` — codex suggested: assert the full transformed sprite footprint against the aperture instead of only the iris centre. Escalated because: **the suggested invariant is architecturally wrong here.** The occluder (lid) composites *over* the sprite, so any iris overflow beyond the aperture is covered, not clipped-as-artifact; the iris disc is intentionally larger than the aperture (that is how lids cover the eye). The correct invariant is that the iris *centre* (pupil) never slides out from under the lid, which the test asserts and its comment (lines 764-770) already documents. A full-footprint containment assertion would fail by design. Raised in both passes.

## Reverted

None — the one applied fix passed the fast gate and the browser check on the first try.

## Verify

- Fast gate each pass: `pnpm verify` (Biome + tsc + astro check) 0 errors / 0 warnings, `pnpm test` 273/273 vitest green.
- Gaze-specific behaviour validated directly against this worktree's dev server (port 4322): e2e reduced-motion gate (zero rig-asset fetches), the pinned-pose visual spec (both shifts), and an 11/11 real-headless-browser live-motion proof including the AE2 pause→contact fix.
- Full `pnpm verify:all` (Playwright visual + Lighthouse) was NOT run locally this session: port 4321 is held by a concurrent worktree, so a clean full-suite run isn't possible here. Those gates run on the PR via the required `verify-all` + `chromatic` checks, plus remote Devin Review.
