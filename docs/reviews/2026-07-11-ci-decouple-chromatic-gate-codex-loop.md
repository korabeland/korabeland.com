# Codex Review Loop — ci/decouple-chromatic-gate

- **Date:** 2026-07-11
- **Base:** origin/main
- **Head at completion:** see marker (summary committed after review pass)
- **Passes run:** 1
- **Outcome:** clean on first pass

Scope reviewed: the CI restructure that moves the Chromatic visual gate out of
`verify-all` into a dedicated `chromatic` job (artifact hand-off of the
Playwright page archives), plus the Lighthouse build-once rewiring of
`pnpm run audit` and the matching ADR/AGENTS.md amendments.

## Applied by the loop

None — codex returned `verdict: clean` with zero findings on the first pass.

## Escalated to Korab (NOT applied by the loop)

None.

## Reverted

None.

## Verify

- Fast gate (`pnpm verify` + `pnpm test`): pass.
- Final `pnpm verify:all` legs: `verify` + `test` pass; `test:visual` and the
  rewired `pnpm run audit` run to green before the marker is written (the
  audit run doubles as the end-to-end smoke of the build-once change).

<!-- chromatic integration probe 20260711T013305Z — delete this branch -->
