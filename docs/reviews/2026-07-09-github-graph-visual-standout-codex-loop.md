# Codex Review Loop — claude/github-graph-visual-standout-9f515e

- **Date:** 2026-07-09 (pre-merge) → 2026-07-10 (post-merge convergence)
- **Base:** main
- **Outcome:** stopped on oscillation — all remaining findings verified as non-issues

The branch was reviewed across two sessions: before syncing onto main, and again
after merging the advanced main (audit PRs #16–18). Codex is non-deterministic
across passes; each finding was triaged and empirically tested. The final review
pass over the merged branch returned `verdict: "clean"`. One trivial comment fix
was applied; every torch-coordinate finding codex raised was empirically
disproven and not applied.

## Applied by the loop

- **[quality/low]** `src/components/ShiftLog/ShiftLog.astro` (torch clip padding
  comment) — the comment said the vertical padding must cover the max blur "(8px)",
  but `MAX_BLUR` was bumped to 10 when the cells grew. Updated the comment to track
  the configured blur + scale bloom (~11px, covered by `--s-3` = 12px). Comment-only,
  behaviour-preserving.

## Escalated / dismissed as false positive (NOT applied)

Codex flagged the cursor-torch coordinate math three times across passes (a scroll
offset shift; an `offsetLeft`-caches-the-same-x claim). All were **empirically
disproven** and not applied — codex's suggested fixes would have *introduced* bugs:

- The grid is the scrolled, `position: relative` offsetParent, so
  `grid.getBoundingClientRect().left` (read live per `mousemove`) already tracks the
  internal horizontal scroll, matching the cached scroll-invariant `offsetLeft`
  centers. Verified: at 340 px with the scroll container moved 194 px, the cell
  **under the cursor** glows.
- `offsetLeft` correctly reflects each cell's column position through the static
  `.shiftlog-week` wrappers. Verified: hovering left/middle/right busy cells
  (offsetLeft 546 / 665 / 870) lights the cell under the cursor each time, with the
  glow cluster centered on that column (546-597 / 631-682 / 870-887) — not stuck at
  the left edge.

A later pass also raised a **listener-teardown** concern (`resize`/`mousemove`/
`mouseleave` never removed → leak on Astro page transitions). Dismissed: the site
uses **no view transitions** (`grep` for `ClientRouter`/`astro:before-swap` is
empty), so every navigation is a full document unload that cleans up listeners, and
**no component in the codebase uses teardown** (OutcomeMetrics, ShiftToggle add
listeners without cleanup). An `AbortController` here would be dead code
inconsistent with the established pattern; if view transitions are adopted later,
teardown must be added systemically, not to this one script.

The loop stopped on oscillation: codex alternated clean / not-clean across passes on
unchanged code, repeatedly re-raising the torch-coordinate false positive. The code
is verified correct by other means — 121 unit tests, the reduced-motion e2e gate,
the empirical torch checks above, stable geometry, and a passing Lighthouse audit.
Korab reviewed and approved proceeding.

## Reverted

None.

## Verify

- `pnpm verify` (Biome + tsc + astro check): green.
- `pnpm test` (Vitest): 121 passed.
- Visual: home baselines regenerated against the merged homepage; element geometry
  is byte-stable across loads (no CLS); residual sub-pixel text jitter on this dense
  page is non-gating (CI single-writes baselines; Chromatic is the visual gate).
- `pnpm run audit` (Lighthouse, desktop, free port): `/` and `/colophon` pass the
  perf ≥ 0.9 / a11y ≥ 0.95 / LCP / CLS gates with headroom.
