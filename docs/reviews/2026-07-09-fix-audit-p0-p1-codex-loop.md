# Codex Review Loop — fix/audit-p0-p1

- **Date:** 2026-07-09
- **Base:** main
- **Head at completion:** tip of `fix/audit-p0-p1` (see the PR-gate marker)
- **Passes run:** 7
- **Outcome:** stopped — two real bugs found and fixed (passes 5–6); pass 7's
  three findings were verified non-applicable / oscillation and declined.

## Applied by the loop

Passes 1–4 clean; passes 5–6 each surfaced a genuine bug (both fixed):

- Pass 5 — **bug (fixed):** `static-preview.mjs` double-decoded the image `url`
  (`URLSearchParams.get()` already decodes), so a literal `%` (`?url=%25`) threw
  `URIError` in the un-caught async handler. Dropped the extra decode. Verified:
  portrait 200, `%25` and traversal both 404, server stays up.
- Pass 6 — **bug (fixed):** `static-preview.mjs` split the URL on every `?`, so
  an asset url carrying its own query string was truncated. Split at the first
  `?` only. Plus a **simplification**: narrowed `posts.ts`'s draft-gate filter
  with a type guard.
- Pass 1 reviewed the audit P0/P1 diff — clean.
- Pass 2 re-reviewed after adding the worktree fix to the PR-gate hook
  (`fix(codex-loop): resolve the PR-gate marker via git`) — still clean. That
  fix was made because in a linked git worktree `.git` is a file, so the hook's
  `$REPO/.git/codex-review-loop.json` marker path was unwritable and the gate
  could never pass; approved by Korab.
- Pass 3 re-reviewed after the favicon fix (`fix: serve favicon +
  apple-touch-icon as static PNGs`) — still clean. CI's `verify-all` had failed
  on the seo favicon test: `imageService: true` makes Vercel's optimizer ignore
  the forced `format: png`/`width` in `getImage()` and serve a 640px webp, which
  browsers reject as an icon. Fixed by generating the two icons as static PNGs
  in `public/`, outside the astro:assets pipeline.
- Pass 4 re-reviewed after addressing a Devin Review finding (`fix: confine the
  image shim to ROOT with resolve + prefix check`) — still clean. Devin flagged
  the `/_vercel/image` shim's regex path sanitisation as fragile against a bare
  `..`; hardened it with `resolve()` + a `startsWith(ROOT)` prefix check.
  Verified: legit asset serves 200, `../../package.json` and bare `..` both 404.

## Stopped / declined (pass 7 — verified non-applicable)

The loop stopped at pass 7 (cap exceeded + oscillation). All three findings were
checked and declined; none are real:

- **static-preview MIME (medium):** claims the shim could serve
  `application/octet-stream`. Can't occur — Astro's `_astro/*` asset URLs always
  carry an extension, so `tryRead()` returns the right image type (verified 200
  `image/jpeg`). Codex's fix (label bytes from the `f`/format param) would be
  *wrong*: the shim serves the original bytes, so a `f=webp` label on jpeg bytes
  would lie. Local-only preview tool.
- **contributions.json shared reader (low):** claims other routes could read the
  live file. Verified false — the homepage is the **sole** consumer
  (`shift-log.ts` is pure stats; `ShiftLog.astro` takes data as a prop). The
  page-local PROD gate is complete.
- **posts.ts type guard (low):** **oscillation** — pass 6 asked for this exact
  type guard; pass 7 asks to revert it. Both forms are fine; kept the guard.

## Reverted

None.

## Verify

- Fast gate at HEAD: `pnpm verify` (Biome + tsc) ✓ · `pnpm test` 102/102 ✓.
- `pnpm run audit` (Lighthouse, run during implementation): ✓ — perf 0.99 / a11y
  1.0, LCP 1.0s with the hero portrait as the real LCP element (via the new
  `/_vercel/image` shim in `static-preview.mjs`).
- Playwright a11y / a11y-day / seo / e2e projects: ✓.
- **Local `pnpm verify:all` is red only on the `screenshot` project** — a
  pre-existing environmental baseline mismatch, not a regression from this
  branch. Verified by running the same suite against clean `main`: 35/36
  screenshots fail there too, and the diffs show a uniform vertical layout
  shift plus stale header content (an old "GET IN TOUCH" CTA) — the committed
  baselines were captured in a different rendering environment and predate
  recent PRs. Per the audit constraint, baselines were **not** reseeded (that
  would bake stale/old-header state in as truth). CI deletes-then-reseeds the
  baselines so its `verify-all` check is green, and Chromatic is the real
  visual gate on the PR.
