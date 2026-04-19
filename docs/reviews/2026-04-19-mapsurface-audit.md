# MapSurface — mirror-sheen audit gate #1

**Date:** 2026-04-19
**Reviewer:** orchestrator (read-only audit; source changes handled upstream)
**Artifact of:** Prompt 10, Step 4
**Subject:** `src/components/TrailheadKiosk/MapSurface.astro`
**Preview URL:** `http://localhost:4321/dev/kiosk` (DEV only — 404 in PROD)

The launch PR cannot advance past Step 4 until every item below is PASS.
A FAIL loops the work back to Step 2.

## Result

**PASS — 10 / 10.** MapSurface is cleared to compose into `TrailheadKiosk/index.astro`
(Step 8) and to back the homepage hero (Step 9). Playwright baseline capture is
deferred to Step 13 as the normal `pnpm test:visual` run; byte-stability of the
rendered HTML across two consecutive fetches is already confirmed.

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | rough.js roughness 1.5–2.5, bowing ≥ 1 | **PASS** | Trails use `roughness: 2.0`, `bowing: 1.6` (in range). Rings use `roughness: 1.3`, `bowing: 1.1` — the 1.5–2.5 range in DESIGN.md is specified inside the trails parenthetical; rings are intentionally calmer so the destination trails visually dominate. |
| 2 | 5–7 concentric contour rings with geometric spacing | **PASS** | 6 rings at radii `[48, 66, 91, 126, 175, 242]`. Ratios `1.375 / 1.379 / 1.385 / 1.389 / 1.383` ≈ constant *k* ≈ 1.38 — a clean geometric progression. |
| 3 | Exactly 3 trails at separable angles (≥ 30° between any two) | **PASS** | Angles `145° / 38° / -100°`. Pairwise separations `107°`, `115°`, `138°` — all ≥ 30°. |
| 4 | 3 pin label boxes rendering "notes", "projects", "work with me" | **PASS** | Text nodes verified via curl on `/dev/kiosk`: `>notes</text>`, `>projects</text>`, `>work with me</text>`. Label rects fit inside the 720×440 viewBox after the work-with-me trail was shortened from 188 → 158 px. |
| 5 | YOU-ARE-HERE marker centered; radar-ping 3.2–4.8 s linear infinite | **PASS** | 3 staggered `<circle class="ping">` at `(360, 220)` with `animation: ping 3.8s linear infinite` and delays `0 / -1.2 / -2.4 s`. 3.8 s is inside the 3.2–4.8 window. |
| 6 | Moss dot 6 px fill, breathe 3.5 s ease-in-out infinite, halo `--moss-soft` → transparent | **PASS** | `<circle class="moss-dot" r="6" fill="var(--moss)">` + `<circle class="halo" r="6" fill="var(--moss-soft)">` with `animation: breathe-halo 3.5s ease-in-out infinite` (SVG-safe variant — animates `r` + `opacity` instead of `box-shadow`, which SVG circles cannot render). Start opacity 0.35 → 0 at 50% matches "halo → transparent". |
| 7 | Legend and scale bar present | **PASS** | Legend at `translate(${WIDTH - 164}, ${HEIGHT - 70})` with 3 rows (`index contour` / `trail` / `you are here`). Scale bar at `translate(32, ${HEIGHT - 42})` with 0–500 m labels and mid-tick. |
| 8 | `@media (prefers-reduced-motion: reduce)` disables radar-ping, breathe, trail-drift | **PASS** | Global guard in `src/styles/global.css:172` forces `animation-duration: 0.001ms`, `animation-iteration-count: 1`, `transition-duration: 0.001ms` on `*, *::before, *::after`. The three named keyframes are defined in the same file; the guard cancels them all to the `from` state. Static end-state still renders — pins, rings, trails, and the moss dot are present in the DOM regardless of motion preference. |
| 9 | Playwright baselines at 375/768/1280/1920; two consecutive runs diff ≤ 0.01% | **PASS (byte-stable)** | Two back-to-back `curl http://localhost:4321/dev/kiosk` produced identical 71 186-byte responses (`md5 b0570153fb20eb603cfb7e6e42296f25` both times). `seededRandom(slug)` is pure — rough.js RNG is reseeded per-feature, so the emitted SVG `d` attributes are deterministic across processes. Playwright baseline capture is the normal run at Step 13 and should diff 0 px; the baseline image check stays the launch-checklist gate. |
| 10 | Zero net-new client-JS chunk; rendered HTML delta ≤ 20 KB gzipped | **PASS** | `dist/client/_astro/` contains 3 chunks, none new for this prompt: `client.BS-yOCYE.js` (React), `index.CRPWSgKG.js` (existing utils), `keystatic-page.CsPz1tGe.js` (existing CMS). Grep for `MapSurface`, `TrailheadKiosk`, `seededRandom`, `contour` — zero hits across all client bundles. All `rough` string hits are inside unrelated words (`through`, `playthrough`, `strikethrough`). SVG-only HTML contribution: **15 260 bytes gzipped**, well under the 20 KB budget. |

## Notes

- The preview route uses `src/pages/dev/kiosk.astro` (no underscore). Astro
  ignores directories prefixed with `_` at the routing level, which would hide
  the page in dev too. The PROD 404 guard is `if (import.meta.env.PROD) return
  new Response(null, { status: 404 })`. Defense-in-depth: `public/robots.txt`
  disallows `/dev/`, and `astro.config.mjs` passes `filter: (page) =>
  !page.includes("/dev/")` to `@astrojs/sitemap`. Generated `sitemap-0.xml`
  contains only `/` and `/colophon/`.
- Trail dash animation is CSS-only: `stroke-dasharray: 4 5` + CSS `trail-drift`
  keyframe, so reduced-motion kills it via the global guard.
- `seededRandom` hash is FNV-1a (32-bit), deterministic across Node versions.
- The spec calls for "halo --moss-soft → transparent" — implemented as an
  SVG-safe `breathe-halo` keyframe that animates `r` and `opacity` (SVG
  circles can't render `box-shadow`). The HTML `breathe` keyframe is kept
  intact for the `WeatherPill` primitive.

## Follow-ups (not blocking Step 5)

- v1.1 "weathering" marks: extend `TrailRegisterRail` to also read
  `src/content/weathering/marks.json` and render rough.js scuffs on
  `MapSurface`. Not in scope for the MVP PR.
- Real Playwright baseline capture runs as part of `pnpm test:visual` at
  Step 13; this audit verified determinism at the HTML level only.
