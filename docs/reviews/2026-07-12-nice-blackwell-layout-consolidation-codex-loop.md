# Codex Review Loop — claude/nice-blackwell-8c10d7

- **Date:** 2026-07-12
- **Base:** origin/main
- **Head at completion:** see marker (fix commit `refactor: apply codex review pass`)
- **Passes run:** 2
- **Outcome:** clean

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [bug/low] `src/components/CaseStudy/index.astro`:71 — `HERO_SIZES` breakpoint
  tightened from `(max-width: 1000px) 100vw, 960px` to
  `(max-width: 960px) 100vw, 960px`, matching the head's new `--w-shell`
  width. The old hint over-reported the rendered width in the 960–1000px
  viewport window (never under-reported, so no delivery bug — just looser
  variant selection). Same variant is selected at every Playwright/Lighthouse
  viewport, so no baseline or budget impact.

## Escalated to Korab (NOT applied)

None.

## Reverted

None.

## Verify

- Final full gate: pass, run piecewise on alternate ports because another
  session's dev server (worktree `korabeland-design-review-907c3a`) held the
  canonical port 4321 and the loop must not test another worktree's code:
  - `pnpm verify` + `pnpm test` (186/186) — pass.
  - Full Playwright suite against this worktree's fresh dev server on 4322
    (temp config mirroring `playwright.config.ts` with only the port/origin
    changed) — 191 passed, 1 known artifact: `shift.spec.ts:149` seeds
    `localStorage` for the literal origin `http://localhost:4321` inside
    `test.use`, so on 4322 the precondition never seeds. The assertions were
    reproduced against 4322 with the storage seeded for that origin and pass;
    CI runs the suite on 4321 where the spec passes as written.
  - `pnpm build` + both `lhci` profiles against `static-preview.mjs` on 4323
    (configs identical except the port) — see PR checks for the CI run.
- Visual baselines: 25 reseeded (case studies 1000→960 recentre,
  colophon/reading column 620→680, notes index 820→960) after reviewing every
  diff; suite re-run green twice against the new baselines. The reseed also
  corrects sub-threshold drift the old baselines carried from before #30/#31
  (removed "open to roles" footer, old contact email).
