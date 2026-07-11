# Codex Review Loop — ci/chromatic-app-required-check

- **Date:** 2026-07-11
- **Base:** origin/main
- **Passes run:** 1
- **Outcome:** clean on first pass

Scope reviewed: making the Chromatic GitHub App's `UI Tests` status the
required visual check (verified installed 2026-07-11), turning the CI
`chromatic` job into a publish-only step with `--exit-zero-on-changes`, and
the matching ADR amendment (b) + AGENTS.md §8 update.

## Applied by the loop

None — codex returned `verdict: clean` with zero findings on the first pass.

## Escalated to Korab (NOT applied by the loop)

None.

## Reverted

None.

## Verify

- Fast gate (`pnpm verify`): pass. Change is CI-config + docs only; no source
  behaviour touched (Playwright/Lighthouse legs are unaffected by ci.yml/docs).
- Branch-protection required-check swap (`chromatic` -> `UI Tests`) is a
  post-merge API step, gated on a Chromatic build first posting the `UI Tests`
  check-run so the exact context name is verified rather than assumed.
