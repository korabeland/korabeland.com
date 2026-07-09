# Codex Review Loop — perf/audit-p2

- **Date:** 2026-07-09
- **Base:** main
- **Head at completion:** tip of `perf/audit-p2` (see the PR-gate marker)
- **Passes run:** 1
- **Outcome:** stopped — both findings verified false against built output and
  declined; no changes applied.

## Applied by the loop

None.

## Stopped / declined (verified false)

Codex raised two findings; both were checked against the actual build/test
artifacts and are incorrect (outdated Astro knowledge + a wrong assumption about
the Chromatic integration):

- **`output: "static"` breaks SSR routes (bug, HIGH):** claims `prerender =
  false` routes aren't served as Vercel functions under `output: "static"`.
  **False in Astro 6 + @astrojs/vercel@10** (the pre-Astro-5 behavior codex
  describes was merged away when `hybrid` folded into `static`). Verified against
  `.vercel/output/config.json`: `/off-trail`, `/dev/experience-preview`, and
  `/dev/skills-preview` all route to `_render` (a real `nodejs22.x` function),
  and none emit a static file. The plan (item 8) explicitly calls out that
  Astro 6 static-with-adapter supports per-route opt-out.
- **CI early-return breaks Chromatic archiving (bug, medium):** claims returning
  before `page.screenshot()` leaves nothing for Chromatic to archive. **False** —
  `@chromatic-com/playwright` archives the page in its fixture teardown, not via
  `page.screenshot()`. Verified: a `CI=1` run produced
  `test-results/chromatic-archives/archive/…snapshot-1.w1280h800.snapshot.json`
  plus the archived assets. The pixelmatch diff is the only thing the early
  return skips — which is the intended, honest behavior.

## Verify

- `pnpm verify` (biome + tsc + astro check) ✓ 0 errors · `pnpm test` 112/112 ✓
- e2e 42 ✓ · a11y/a11y-day/seo 36 ✓ · CI-mode screenshot 9 ✓ (honest, no seed) ·
  `pnpm run audit` ✓ under `output: "static"`
- Build verified: og.png + 404 static; `/projects→/work` 301s intact; off-trail
  + dev/* the only serverless routes.
- Local non-CI `screenshot` project is environmentally red (macOS baselines) —
  pre-existing, not reseeded; CI self-skips it (item 11) and Chromatic gates.
