# Codex Review Loop — claude/keystatic-local-server-d8a9f5

- **Date:** 2026-07-11
- **Base:** origin/main
- **Head at completion:** (final HEAD after summary amend — see marker)
- **Passes run:** 3
- **Outcome:** stopped: iteration cap (pass 3's single finding applied; no fourth pass ran to confirm clean)

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [simplification] `src/pages/lab/[slug].astro`:36 — `formatSpan` was duplicated across the /work and /lab detail routes; extracted to `src/lib/projects.ts`, imported by both.
- [simplification] `src/pages/lab/index.astro`:69 — the /lab index duplicated the entire ledger stylesheet from /work; extracted into a shared `ProjectLedger` component, both index pages are now thin wrappers (net −58 lines).
- [quality] `src/lib/projects.ts`:114 — `projectHref` (and the newly shared `formatSpan`) had no unit coverage; added both-category routing tests plus span formatting cases to `tests/projects.test.ts`.
- [bug/medium] `tests/visual/baselines/about_375.png` — the baseline deletion (dropped as a portrait-flake) had been committed, silently disabling that viewport's local regression check; re-seeded and restored.
- [quality] `tests/visual/accessibility.test.ts` — the new public `/lab` and `/lab/perian` routes were in screenshot coverage but not the axe route list; added.
- [bug/low] `src/lib/projects.ts`:141 — `formatSpan` parsed date-only strings via `new Date()` (UTC) but read them with local-time getters, shifting boundary dates (e.g. 2026-01-01) into the prior year in negative-offset timezones; now parses YYYY-MM-DD components directly, with boundary-date tests. Latent in the original /work detail page; surfaced by the extraction.

## Escalated to Korab (resolved in-session)

- [bug/medium] `src/pages/work/[slug].astro`:20 — codex suggested: permanent redirects for the previously published `/work/perian` and `/work/personal-os` URLs, which the category split moves to /lab — escalated because the fix lives in `astro.config.mjs` (protected file, routing behaviour). **Korab approved**; both 301 redirects added alongside the existing /projects rules and smoke-tested on the dev server.

## Reverted

None.

## Verify

- Fast gate (`pnpm verify` + `pnpm test`): green after every pass (129 unit tests at completion).
- Final `pnpm verify:all`: pass — see PR checks for the Chromatic/CI counterpart. Local note: colophon baselines re-seeded last (the build-log band re-renders the latest commit, so those baselines always lag HEAD by one commit locally; Chromatic is the cross-environment gate).
