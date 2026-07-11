# Codex Review Loop — claude/home-page-text-removal-1c393e

- **Date:** 2026-07-11
- **Base:** origin/main (757bcdf)
- **Head at completion:** branch tip after baseline reseed (see `git log`)
- **Passes run:** 3 (stopped: iteration cap)
- **Outcome:** stopped: iteration cap — the only remaining finding is an escalation (visual-baseline reseed + Chromatic approval), handled per the visual-approval policy below.

## Context

The change removes the "open to work" / availability language from every
human-visible surface (home hero chip, about-page chip + resume link, global
footer echo, OG social-card status line, the about line's visa-sponsorship
clause, and the `StatusChip` `available` status / "open to roles" default
label). LLM-facing copy (`llms.txt`, JSON-LD `personDescription`) is
deliberately left intact.

## Applied by the loop

All three passes surfaced test-contract updates required by the intentional
removal — removing the UI without updating its assertions was an authoring
omission, so these complete the change rather than mask a regression. Folded
into the single feature commit (each commit stays green / bisectable).

- [bug] `tests/visual/seo.spec.ts`:21 — homepage `<title>` SEO contract updated
  `korab eland · operator · builds with ai` → `korab eland` (codex pass 1).
- [quality] `tests/e2e/routes.spec.ts` — dropped the `.hero-avail` availability
  assertions and the `.footer-avail` echo assertion; kept the portrait, rail,
  and contact-CTA checks (self-found alongside pass 1).
- [bug] `tests/e2e/routes.spec.ts`:41 — removed the stale `.hero-eyebrow`
  assertion (selector deleted in turn 1); the hero is still asserted via
  `h1#hero-heading` (codex pass 3).

## Escalated to Korab (NOT applied by the loop)

- [quality/medium] **Visual baselines + Chromatic approval.** Removing the
  footer availability line (every page), the home hero line, and the about
  status chip changes rendered output. Per the repo visual-approval policy this
  needs (a) local baselines reseeded after visual review, and (b) the Chromatic
  **UI Tests** status approved for the deliberate diff in Chromatic's UI — a
  human action I can't perform.
  - **Resolution (local, done):** reseeded 21 local baselines after visually
    reviewing the diffs. The home @ 1280 diff was pure intended removal
    (eyebrow, hero avail line, footer echo, and the upward reflow they cause);
    the rest are the footer wrap at 375px (−17px height) plus the home/about
    layout shifts. `notes/system-designer-personal-os @ 375` was re-seeded from
    a fresh dev server after a first seed captured a degraded hero-image render
    on a stale server (see Verify note).
  - **Remaining (human):** Chromatic UI Tests approval on the PR.

## Reverted

- None.

## Verify

- `pnpm verify` (biome + tsc + astro check): green.
- `pnpm test` (vitest): 186 passed.
- `pnpm test:visual` (Playwright, fresh server): 180 passed, 0 failed after the
  baseline reseed.
- `pnpm audit` (Lighthouse desktop + mobile): green (change only removes DOM
  content, so no perf/LCP/CLS regression).
- **Environment note:** a "Failed to fetch dynamically imported module" error
  intermittently failed a timing-sensitive e2e test. Diagnosed as a Vite
  dep-optimization artifact on a long-running dev server whose dep hashes went
  stale mid-session (Vite logged "Re-optimizing dependencies because vite config
  has changed"). Restarting the dev server cleared it — not a code issue.
