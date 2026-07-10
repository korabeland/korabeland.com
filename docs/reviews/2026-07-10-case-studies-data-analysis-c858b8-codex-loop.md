# Codex Review Loop — claude/case-studies-data-analysis-c858b8

- **Date:** 2026-07-10
- **Base:** origin/main
- **Head at completion:** (see marker; this commit)
- **Passes run:** 2
- **Outcome:** clean

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [bug] `src/content/projects/chat-capture-gap/index.mdoc`:11 — the `outcome` field read "automation shipped" while the entry has no `shippedAt`, so the ledger renders it "in flight" and the copy contradicted the status chip. Reworded the outcome to "automation rolling out", which matches the truthful in-flight status without inventing a ship date.

## Escalated to Korab (NOT applied)

None from the review loop (codex was clean on pass 2).

Separate product decisions surfaced outside the loop (not codex findings): Personal OS held from publish (its repo is largely a CC BY-NC-SA fork and is saturated with employer-confidential content — framing is Korab's call); `shippedAt` left unset on the four in-flight studies pending Korab's voice pass.

## Reverted

None.

## Verify

- `pnpm verify` (biome + tsc + astro check): pass. `pnpm test` (vitest, 121): pass. Build: pass (`/og.png` needs a font present only in an installed `node_modules`; worktree-symlinked locally, present natively in CI).
- `pnpm test:visual` (local pixelmatch): not used as a gate. It fails on this machine for unrelated pages (`/about`, `/notes`, `/colophon`) due to environmental baseline drift; CI self-skips the local pixel diff by design and Chromatic (`--exit-zero-on-changes`) is the cross-environment visual gate. The `/work`, home, and `/work/ai-sms-pilot` renders were verified manually via screenshots; baselines were intentionally NOT reseeded locally.
