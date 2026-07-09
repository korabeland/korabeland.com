# Codex Review Loop — claude/github-graph-visual-standout-9f515e

- **Date:** 2026-07-09
- **Base:** main
- **Passes run:** 2
- **Outcome:** stopped — 1 escalation (a verified false positive, not applied)

Pass 1 (over the code diff at `9b3a035`) returned `verdict: "clean"`. Pass 2 (after
`pr-bot` appended the PR-preview screenshots — **no code change**) returned one
`bug` finding on the cursor torch. Codex is non-deterministic across passes; the
finding was triaged, empirically tested, and escalated as a false positive. No
fixes were applied.

## Applied by the loop

None.

## Escalated to Korab (NOT applied)

- **[bug/medium]** `src/components/ShiftLog/ShiftLog.astro` (torch `onMove`) — codex
  claimed the glow is shifted by the scroll amount after horizontal scrolling,
  because cell centers are cached from `offsetLeft` (scroll-invariant) while the
  pointer is derived from `getBoundingClientRect()`. Suggested fix: add
  `scrollEl.scrollLeft` to the pointer coordinate.

  **Verdict: false positive — NOT applied.** The grid *is* the scrolled content, so
  `grid.getBoundingClientRect().left`, read live on every `mousemove`, already
  tracks the internal scroll; the pointer is therefore in the same grid-content
  coordinate space as the cached `offsetLeft` centers. Codex's fix would
  double-count the scroll and *introduce* the bug it describes.

  Verified empirically: at a 340 px viewport with the scroll container moved 194 px
  to the right, hovering a busy cell lights the cell **under the cursor**
  (`targetUnderCursorGlows: true`) — the coordinates are correct under scroll.
  Korab reviewed this escalation and approved proceeding.

## Reverted

None.

## Verify

- Final `pnpm verify:all`: **pass**, run component-by-component to route around a
  sibling worktree holding port 4321 (the shared dev/preview port):
  - `pnpm verify` (Biome + tsc): green
  - `pnpm test` (Vitest): 114 passed
  - `pnpm test:visual`: 72 passed via the CI-mirror flow (reset baselines, render
    every route on this branch's code against a local server, then restore the
    committed baselines); the shift-log torch e2e gate and axe (both palettes)
    passed; the four home baselines regenerate deterministically.
  - `pnpm run audit` (Lighthouse, desktop preset, on a free port): `/` and
    `/colophon` both perf 1.00 / a11y 1.00 / seo 1.00, LCP ≤ 603 ms, CLS 0.000 —
    the larger grid and the new torch script introduced no layout shift or perf
    regression.
