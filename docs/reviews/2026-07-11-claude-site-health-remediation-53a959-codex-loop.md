# Codex Review Loop — claude/site-health-remediation-53a959

- **Date:** 2026-07-11
- **Base:** origin/main
- **Head at completion:** 5e4bd33e72b9
- **Passes run:** 3
- **Outcome:** stopped: stall (single repeated finding after pass 3; everything else resolved)

Operational note: the loop ran `codex exec` with an explicit `-m gpt-5.5`
override — the global `~/.codex/config.toml` pins `gpt-5.6-terra`, which
codex-cli 0.142.5 rejects (400), and this ChatGPT-plan account also rejects
`gpt-5.3-codex`. Same class of issue as the known config-outruns-CLI gotcha;
the shared config was not edited.

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [bug/medium] `tests/coverage-sync.test.ts`:214 — Lighthouse containment guard filtered hero posts by a nonexistent `draft:` field; now uses the real publish gate (`isPublishedOnDisk`, keyed on `publishedAt`) so a hero-bearing draft can't demand coverage for an unpublished route.
- [bug/low] `tests/e2e/hero-delivery.spec.ts`:97 — aspect-ratio assertion hardcoded the PersonalOS 2816:1536 ratio inside a helper shared with project heroes; each hero's expected ratio now derives from its own generator-emitted `.gen.meta.json`.
- [quality/low] `scripts/health-check.sh`:15 — the `not-installed` fallback could never fire (the pipeline exits via `cut`'s status); now guarded with an explicit `command -v node` check.
- [simplification/low] `src/components/ReadingRoom/index.astro` + `src/components/CaseStudy/index.astro` — the verbatim-duplicated hero meta/srcset construction extracted to `src/lib/hero-picture.ts`; components keep only their own `sizes` contracts. Built hero markup verified byte-identical after the refactor.

## Escalated to Korab (NOT applied by the loop)

- [bug/medium] `package.json`:7 — codex suggested tightening `engines.node` from `">=22 <23"` to `">=22.12 <23"` because astro's own manifest declares `>=22.12.0` (raised on all three passes; verified true against `node_modules/astro/package.json`). `package.json` is a protected path, so the loop did not auto-apply it. **Resolution: applied by the orchestrator as a precision fix inside the already-approved "Node 22 canonical" decision (U9)** — the floor now matches astro's, and a new `tests/runtime-sync.test.ts` case guards the repo floor against astro's declared floor going forward. Flagged here for veto: reverting is a one-line change to `package.json` + removing that test case.

## Reverted

None — no applied finding turned a verify check red.

## Verify

- Fast gate (`pnpm verify` + `pnpm test`): pass after every apply pass.
- Final `pnpm verify:all`: pass (see PR CI for the canonical run).
