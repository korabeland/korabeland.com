# Codex Review Loop — claude/portrait-gaze-requirements-752aa3

- **Date:** 2026-07-11
- **Base:** origin/main (7c75fc5)
- **Head at completion:** (this commit)
- **Passes run:** 2
- **Outcome:** stopped: remaining findings escalated (no safe auto-applicable findings left; a third pass with no changes would only re-surface the same two)

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [bug] `src/components/Portrait/index.astro`:294 — the rig only re-evaluated on `mousemove`, so a pointer leaving the viewport (or the window blurring), or the page scrolling/resizing under a stationary cursor, left the pupils holding their last gaze until the 3s idle timer instead of resetting when the cursor was no longer in the band. Added a `schedule()` repaint on `scroll`/`resize` and an immediate `rest()` (clearing cursor state) on `document` `mouseleave` and window `blur`. Tightens R1/R4. All new listeners stay inside the double gate, so the reduced-motion path and every visual baseline are unaffected — confirmed by the unchanged home/about baselines and the reduced-motion e2e still passing.

## Escalated to Korab (NOT applied)

Findings the loop refused to auto-apply. These need a human decision.

- [quality/low] `tests/e2e/portrait-gaze.spec.ts`:14 — codex suggested: add a Playwright context with reduced motion disabled and a fine pointer, assert the overlay goes live and that pointer movement changes pupil transforms and leaving the band resets them. — escalated because: this deliberately conflicts with the repo's established convention. The ShiftLog cursor-torch spec is the direct precedent and tests only the reduced-motion-off path, documenting why (Playwright emulates reduced motion globally; a forced no-preference context to test decorative motion "buys little over the unit-tested math plus the manual visual check", and the live motion is rAF-driven and flake-prone). The gaze rig's math is covered by 33 unit tests (`tests/portrait-gaze.test.ts`) and the live effect was verified in-browser across both shifts. Adding a live-motion Playwright project is a test-infra/config change with a real flake risk; it is a strategy call for Korab, not a safe auto-apply.

- [quality/low] `scripts/gen-hero-variants.ts`:323 — codex suggested: either derive the component's portrait records from `PORTRAIT_VARIANTS`, or narrow the comment, because adding a variant updates generation + manifest coverage but not the component's rendering. — escalated because: the finding rests on a misread. The comment states `PORTRAIT_VARIANTS` is the SSOT shared with "the gaze rig's eye manifest and its coverage test" and "the render pass below" (gen-hero-variants' own render loop); it does not claim the `Portrait` component's fixed night/day `<picture>` pair derives from it. The component intentionally renders exactly two states (the two shifts), so there is no third-variant scenario to keep in sync. The file is also a `scripts/gen-*.ts` (data generation), which is on the escalation boundary. No change made.

## Reverted

None.

## Verify

- Final `pnpm verify:all`: **pass** (Biome + `tsc` + `astro check` + Vitest 219/219 + Playwright visual + Lighthouse desktop & mobile, exit 0). Home/about visual baselines unchanged; only the four colophon baselines were reseeded for the deliberate R14 provenance line (visually reviewed).
