# Codex Review Loop — claude/korabeland-design-review-907c3a

- **Date:** 2026-07-12
- **Base:** origin/main
- **Head at completion:** (fix commit, see git log)
- **Passes run:** 3
- **Outcome:** stopped: iteration cap (all remaining findings resolved or refuted)

## Applied by the loop

- [quality/medium] `src/components/OffTrail/OffTrail.astro`:34 — moved `id="off-trail-title"`
  from the decorative "no signal" eyebrow to the new h1, so the section's
  `aria-labelledby` names the real page heading. `tests/e2e/routes.spec.ts` updated to
  assert the new structure (the old assertion encoded the pre-fix id placement).
- [quality/low] `src/pages/index.astro`:114 — documented that the homepage note list is
  deliberately month-level ("jul 2026") while /notes carries full `YYYY.MM.DD` stamps.
  (Codex misread the helper as MM.DD.YY; the doc comment prevents the next reviewer
  tripping on it.)
- [bug/medium] `src/lib/posts.ts`:23 — `formatNoteDate` now uses UTC getters. Date-only
  frontmatter parses as UTC midnight; local getters would render the previous calendar
  day anywhere west of Greenwich.
- [bug/low] `src/layouts/BaseLayout.astro`:458 — mobile `.chrome-nav { overflow-x: auto }`
  forced `overflow-y: auto`, clipping the 44px hit-area pads at the scroll box
  (verified: taps above nav links missed). Fixed with `padding-block: 14px` +
  `margin-block: -14px` — clip box grows, layout unchanged.
- [tests] `tests/e2e/hit-areas.spec.ts` (new) — asserts adjacent chrome hit-pads never
  overlap (375px + 1280px) and that a tap 8px above a nav link activates it at both
  viewports. Would have caught the overflow-clip bug.

## Escalated to Korab (NOT applied)

None requiring a decision. One finding rejected with evidence:

- [bug/medium] `src/styles/global.css` (footer hit pads) — codex predicted the 44px-wide
  pads on inline footer links overlap and that the new spec "is expected to fail".
  Measured geometry (elementFromPoint + pad-rect maths at 375px and 1280px): zero
  overlaps; footer links are ≥40px wide so pads extend ≤2px per side into ~10px gaps.
  The hit-areas spec passes and now guards this permanently.

## Reverted

None.

## Verify

- Fast gate (`pnpm verify` + `pnpm test`): green after every pass.
- Final `pnpm verify:all`: pass (Biome, tsc, astro check, Vitest 186, Playwright
  visual/e2e/a11y, Lighthouse desktop + mobile).
