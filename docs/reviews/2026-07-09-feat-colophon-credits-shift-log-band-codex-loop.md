# Codex Review Loop — feat/colophon-credits-shift-log-band

- **Date:** 2026-07-09
- **Base:** main
- **Head at completion:** f65cde1
- **Passes run:** 3 (hit the iteration cap)
- **Outcome:** stopped: iteration cap — all material findings resolved; the one
  remaining finding is an intentional, previously-approved design choice.

## Applied by the loop

Findings codex raised that Claude applied and that survived the fast gate
(`pnpm verify` + `pnpm test`).

- [bug] `src/pages/colophon.astro` — the featured commit's `<time class="commit-when">`
  used a bare `.commit-when` selector (0,1,0), which lost to `.colophon .t-mono`
  (0,2,0), leaving a stray bottom margin that padded the space before the subject.
  Fixed by raising the reset to `.commit-featured .commit-when`.
- [simplification] `src/pages/colophon.astro` — removed a redundant `{featured && …}`
  guard on the featured block. The section is already gated by `commits.length > 0`
  and `const [featured, ...rest] = commits` guarantees `featured` is defined.

## Correction (pass 1 — bigger than a normal finding)

Pass 1 flagged code that was **not authored for this feature**: four social-icon
constants (`X_ICON`/`LINKEDIN_ICON`/`GITHUB_ICON`/`MAIL_ICON`) injected via `set:html`
plus a `.hero-social` block. Root cause: the branch's diff was captured with
`git diff <files>` from a **shared worktree** where another chat had concurrent
uncommitted edits to `src/pages/index.astro`, so their in-progress hero work was
swept into this branch's commit. Resolved by rebuilding `index.astro` as
`main` + only the shift-log additions (loader, band, CSS); the other chat's work
stays theirs. This is the loop's most valuable catch.

## Escalated to Korab (NOT applied)

- [bug/medium] `src/pages/colophon.astro` `relativeTime()` — the featured commit's
  "shipped N days ago" is evaluated once at prerender, so it can go stale between
  deploys. **Intentional, no-JS design, already discussed and approved** (the featured
  commit is what triggers each deploy, so it renders honest at build). Recorded, not
  changed. Switching to an absolute date would alter rendered output.
- [quality/low] `src/pages/index.astro` JSON-LD `sameAs` — now that the homepage links
  GitHub (the band's "on github →"), consider adding `https://github.com/korabeland`
  to the Person `sameAs`. Behaviour-changing (SEO/structured-data output) → not
  auto-applied; Korab's call.

## Reverted

None.

## Verify

- Fast gate each pass: `pnpm verify` (Biome + `tsc`) ✓ · `pnpm test` (Vitest 102/102) ✓
- `pnpm build` (production, prerender) ✓ — built HTML verified: home has no
  contamination + the shift band; colophon leads with the build log, no shift log.
- Full `pnpm verify:all` (Playwright e2e/visual + Lighthouse): **deferred to CI.**
  Local run is blocked — the shared worktree holds `:4321`, which both the Lighthouse
  static-preview and the Playwright baseURL bind. CI runs `verify:all` authoritatively
  on the PR (it wipes/self-seeds visual baselines and runs Lighthouse in a clean env),
  alongside the remote Devin review.

## Note on the PR gate

This branch lives in an isolated worktree while the main checkout is on another chat's
branch, so the PR-gate marker (`.git/codex-review-loop.json`, checked against
`CLAUDE_PROJECT_DIR`'s HEAD) cannot match this branch's HEAD. The loop genuinely ran
(this document + the pass logs are the evidence); opening the PR therefore uses the
sanctioned `CODEX_GATE_OFF=1` override, with CI as the real gate.
