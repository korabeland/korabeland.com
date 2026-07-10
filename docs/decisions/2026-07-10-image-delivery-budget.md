# ADR: Image delivery budget — 200 KB per delivered variant

**Date:** 2026-07-10 · **Status:** accepted · **Origin:** [site health remediation](../plans/2026-07-10-001-fix-site-health-remediation-plan.md) (owner-approved gate decision)

## Decision

Every image variant actually delivered to a visitor is **≤ 200 KB**. The
budget applies to delivered variants, **not** the retained source — a
full-resolution original may stay in the repo (e.g. the 9.7 MB PersonalOS
hero source) as long as no viewport is ever served it.

## Mechanics

- `scripts/gen-hero-variants.ts` (prebuild + predev) generates width-tiered
  AVIF/WebP variants plus one raster fallback for collection heroes and the
  static portraits, stepping quality down (with a logged warning) until each
  file clears the budget, and hard-failing if it cannot.
- Components render `<picture>` with explicit `width`/`height` (layout
  reserve) and per-surface `sizes` contracts — the reading column (620 px)
  and the case-study header (1000 px) are deliberately different.
- The astro:assets/Vercel image pipeline is **bypassed** for these assets:
  `imageService: true` ignores requested widths/formats in this repo
  (favicon precedent, portrait `w=1200&q=100` incident).
- Enforcement: `tests/e2e/hero-delivery.spec.ts` asserts the actual network
  response size at mobile and desktop viewports; CI Lighthouse (desktop +
  mobile) enforces LCP ≤ 2.5 s / CLS ≤ 0.1 on covered routes.

## Exceptions

Intentional artwork that cannot meet the budget at acceptable quality gets a
documented exception: note the asset, the reason, and the accepted size in
this file's Exceptions list below, and keep the perf checks passing on the
routes that serve it. (None currently.)
