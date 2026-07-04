# Console MVP — Ship Review

**Date:** 2026-07-04
**Merged:** commit `df9de1e` (squash-merge, admin bypass), branch `redesign/console` → `main`
**PR:** https://github.com/korabeland/korabeland.com/pull/3
**Plan:** `docs/plans/2026-07-03-console-mvp.md`
**Checked by:** Claude (Sonnet 5) via Claude Code

---

## Fixes applied before merge

| # | Issue | Source | Fix | Status |
|---|---|---|---|---|
| 1 | Missing `sharp` dependency (blocked CI + Vercel image processing) | Devin review | Added as explicit dependency | ✅ |
| 2 | Reading-progress bar invisible on case-study pages | Devin review | `.progress-track` → `position: fixed; z-index: 20` above header | ✅ |
| 3 | Inconsistent contact email | Devin review | Unified to `korabeland@gmail.com` (`colophon.astro`) | ✅ |
| 4 | Stray `build-archive.log` committed | Devin review | Removed + gitignored | ✅ |
| 5 | Dead `siteMeta` singleton (not just unused fields — the whole system) | Devin review | Deleted `keystatic.config.ts` block, `src/lib/siteMeta.ts`, content entry | ✅ |
| 6 | Canonical/`og:url` rendered with a trailing slash, inconsistent with rest of site | Found chasing CI failures | `BaseLayout.astro` strips trailing slash from `Astro.url.href` | ✅ |
| 7 | Sitemap URLs still carried a trailing slash after #6's fix | Devin review (follow-on) | `trailingSlash: "never"` in `astro.config.mjs` | ✅ |
| 8 | 8 CI failures: `/off-trail`, `/404`, `/projects` redirects untestable | Found chasing CI failures | Playwright's CI `webServer.command` switched to `pnpm dev` — approved by Korab, since it changes what CI validates (real SSR instead of the Lighthouse-only static mock) | ✅ |
| 9 | Chromatic step failing with "Found only one commit" on PR-triggered runs | Found chasing CI failures | `fetch-depth: 0` on the checkout step — approved by Korab | ✅ |
| 10 | Keystatic `projects.heroImage` pointed at a source-tree path that 404s in production | Devin review (full comment sweep) | `directory: "public/work"`, matching the working posts-collection pattern | ✅ |
| 11 | personal-os post's hero image existed on disk with alt text written, but was never wired into frontmatter | Devin review (full comment sweep) | Added `heroImage:` field | ✅ |

All 11 independently confirmed resolved by Devin's bot re-review. Final pre-merge state: `verify-all` ×2 SUCCESS, Devin Review SUCCESS, Vercel SUCCESS, Vercel Preview Comments SUCCESS.

## Merge decision

The PR body read "Do NOT merge — Korab reviews first," restated as a standing instruction throughout the build. Korab explicitly reversed that ("Merge and push to main"). Before acting, this was confirmed twice:

1. Once for the reversal itself, given how many times the opposite had been stated.
2. Once specifically for `gh pr merge --admin`, discovered only at merge time: `main` has branch protection requiring 1 approving PR review, and GitHub blocks a PR author from approving their own PR. Since `korabeland` is the only GitHub account here and was also the PR author, the review requirement was structurally unsatisfiable any other way. See `reference_main_branch_protection.md` in Claude Code memory.

## Open — deferred to Korab, not decided

- **Day/night theme toggle.** The day-shift OKLCH tokens still exist in `tokens.css`, but nothing sets `data-time="day"` anywhere — no toggle, no `prefers-color-scheme` mapping. Decide: build the toggle, or delete the dead tokens and commit to dark-only.
- **Production-build smoke test.** Devin flagged the same tradeoff already surfaced when fix #8 was made: Playwright now exercises `pnpm dev`, not the production Vercel build. A small smoke test against the real build would close that gap — not urgent, not yet actioned.

## Found, not resolved

Local `main` is 2 commits ahead of what `origin/main` was before this merge (`c3e0d2e`, `6ab0b92`) that were never pushed, and predates this session. Flagged to Korab; not touched, since the intent behind those commits is unknown.
