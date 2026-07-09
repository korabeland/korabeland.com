# Codex Review Loop — fix/audit-p0-p1

- **Date:** 2026-07-09
- **Base:** main
- **Head at completion:** 9924620
- **Passes run:** 1
- **Outcome:** clean

## Applied by the loop

None. Codex returned `verdict: clean` with no findings on the first pass.

## Escalated to Korab (NOT applied)

None.

## Reverted

None.

## Verify

- Fast gate at HEAD: `pnpm verify` (Biome + tsc) ✓ · `pnpm test` 102/102 ✓.
- `pnpm run audit` (Lighthouse, run during implementation): ✓ — perf 0.99 / a11y
  1.0, LCP 1.0s with the hero portrait as the real LCP element (via the new
  `/_vercel/image` shim in `static-preview.mjs`).
- Playwright a11y / a11y-day / seo / e2e projects: ✓.
- **Local `pnpm verify:all` is red only on the `screenshot` project** — a
  pre-existing environmental baseline mismatch, not a regression from this
  branch. Verified by running the same suite against clean `main`: 35/36
  screenshots fail there too, and the diffs show a uniform vertical layout
  shift plus stale header content (an old "GET IN TOUCH" CTA) — the committed
  baselines were captured in a different rendering environment and predate
  recent PRs. Per the audit constraint, baselines were **not** reseeded (that
  would bake stale/old-header state in as truth). CI deletes-then-reseeds the
  baselines so its `verify-all` check is green, and Chromatic is the real
  visual gate on the PR.
