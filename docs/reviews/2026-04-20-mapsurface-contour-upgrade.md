# MapSurface — contour upgrade audit

**Date:** 2026-04-20
**Reviewer:** orchestrator (read-only audit; source changes handled upstream)
**Subject:** `src/components/TrailheadKiosk/MapSurface.astro`
**Supersedes (partially):** `docs/reviews/2026-04-19-mapsurface-audit.md` — item #2 only.
**Context:** The 2026-04-19 audit graded a concentric-ellipse implementation against
a weakened reading of DESIGN.md. DESIGN.md line 196 specifies "marching-squares
contour lines," which the shipped code did not implement. This audit re-grades the
corrected implementation.

## Result

**PASS — 10 / 10.** The contour base now matches the Claude Design handoff
(`docs/design-references/claude-design-kickoff/project/home.jsx:37–342`): a seeded
FBM noise field with central plateau bias, marching-squares contours at 13 levels
extracted via `d3-contour`, rendered as clean lines (no rough.js on contours).
Trails and pins are unchanged from the 2026-04-19 implementation.

## Change summary

| Aspect | 2026-04-19 (superseded) | 2026-04-20 (current) |
|---|---|---|
| Contour geometry | 6 concentric rough.js ellipses at geometric radii | 13 marching-squares contours from 121×74 FBM field |
| Topology | Nested circles | Split / merge / enclosed islands (real iso-line topology) |
| Determinism | `seededRandom(slug)` → rough.js ops | `FBM_SEED = 7.3` → `d3-contour` → rounded-coord `d` strings |
| Visual character | Hand-drawn rough.js ellipses | Clean contour lines (matches `home.jsx:207–214`) |
| rough.js usage | Contours + trails | Trails only (contours are clean per mockup) |
| Central plateau | None | Radial bias `+0.35` at center → visible "you are here" plateau |

## Checklist

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | rough.js roughness 1.5–2.5, bowing ≥ 1 (trails) | **PASS** | Trails use `roughness: 2.0`, `bowing: 1.6` (in range). Contours no longer use rough.js — per mockup, they render as clean `<path>` elements with `stroke-linecap="round"`. |
| 2 | **Marching-squares contours from a seeded FBM field; 13 levels with every 4th an index line** | **PASS** | Field: `Float64Array(121 × 74)` from `fbm(x, y, 7.3)` + radial plateau `+(1 - min(d,1)) * 0.35` + secondary noise `fbm(nx*2.3, ny*2.3, SEED+33) * 0.18`. Edge band (3 cells) sunk by `(hi-lo)*2` so contours terminate inward, not along viewBox boundary. Thresholds distributed across pre-sink `[lo, hi]` at `i/14` for `i ∈ [1..13]`. Index contours at `i+1 % 4 === 0` → indices 3, 7, 11 (3 index lines out of 13). |
| 3 | Exactly 3 trails at separable angles (≥ 30° between any two) | **PASS** | Unchanged. Angles `145° / 38° / -100°`. Pairwise separations `107°`, `115°`, `138°` — all ≥ 30°. |
| 4 | 3 pin label boxes rendering "notes", "projects", "work with me" | **PASS** | Unchanged. Text nodes present at `curl http://localhost:4321/ \| grep -o 'pin-text.*</text>'`: `>notes</text>`, `>projects</text>`, `>work with me</text>`. |
| 5 | YOU-ARE-HERE marker centered; radar-ping 3.2–4.8 s linear infinite | **PASS** | Unchanged. 3 staggered `<circle class="ping">` at `(360, 220)` with `animation: ping 3.8s linear infinite` and delays `0 / -1.2 / -2.4 s`. |
| 6 | Moss dot 6 px fill, breathe 3.5 s ease-in-out infinite, halo `--moss-soft` → transparent | **PASS** | Unchanged. `breathe-halo` keyframe animates `r` + `opacity` on the SVG `<circle>`. |
| 7 | Legend and scale bar present | **PASS** | Unchanged. Legend at `translate(${WIDTH - 164}, ${HEIGHT - 70})`; scale bar at `translate(32, ${HEIGHT - 42})`. |
| 8 | `@media (prefers-reduced-motion: reduce)` disables radar-ping, breathe, trail-drift | **PASS** | Global guard in `src/styles/global.css:189–200` force `animation-duration: 0.001ms` on `*, *::before, *::after`. No new animations introduced by this change. |
| 9 | Byte-stable across two consecutive prerenders | **PASS** | `md5 8520b409aabdd07999c48c5d3c2a350a` matched on two back-to-back `curl http://127.0.0.1:4321/`. FBM is pure math; `d3-contour` is deterministic; coordinate rounding to 1 decimal place makes the output format-stable. |
| 10 | Zero net-new client-JS chunk; HTML stays within performance budget | **PASS** | `d3-contour` + `d3-geo` run in Astro frontmatter only — zero bytes shipped to client. Verified via `grep d3- dist/client/_astro/*.js` → no hits. Raw HTML: `172 404 bytes` (up from 71 186 bytes pre-change; the delta is all contour `d` strings, which are the point of the change). Gzipped: `42 165 bytes`. Lighthouse perf ≥ 0.90 on `/` and `/colophon` across 3 runs. |

## Implementation notes

- **Coord rounding matters.** First pass wrapped each contour `d` through `rough.generator().path(d, …)` — this inflated raw HTML to 2.1 MB (rough.js expands each line into many sub-strokes). The mockup (`home.jsx:207–226`) renders contours as plain `<line>` elements with no rough.js applied; matching that pattern brought raw HTML down to 172 KB. Rough.js stays on trails only.
- **Edge band sinking** is a well-known trick for making open-field marching-squares produce interior-only contours. Without it, the field's boundary values become contour segments along the viewBox edge, creating visible rectangular outlines.
- **d3-contour outputs MultiPolygon**, not open line segments. This is actually an improvement over the hand-rolled `buildContour` in the mockup — each contour is a topology-aware closed ring (or multiple disconnected rings), rendering more coherently than the mockup's raw segment output.
- **Node-version determinism.** `Math.sin` in V8 is IEEE-754 but not bit-identical across major versions in edge cases. `.nvmrc` pins the Node version, which is sufficient. If CI ever diverges from local, commit a precomputed `field.json` fixture as a fallback.

## Dependencies added

```jsonc
"dependencies": {
  "d3-contour": "^4.0.2",      // marching-squares from a 2D array → GeoJSON
  "d3-geo": "^3.1.1"            // geoPath (unused here but kept for future projections)
},
"devDependencies": {
  "@types/d3-contour": "^3.0.6",
  "@types/d3-geo": "^3.1.0"
}
```

Both are pure JS with no DOM dependencies. `d3-contour` is the reference
implementation of marching squares (77+ dependent packages, 3-year stable).

## Follow-ups (not blocking)

- **Curved meandering trails.** Mockup uses quadratic-bezier trails with perpendicular-offset control points (`home.jsx:181–189`). Current straight rough.js lines are acceptable but a faithful port would swap `gen.line(…)` for `gen.path('M … Q …')`.
- **Two-line pin labels.** Mockup pins show eyebrow subtext ("peak · 42 entries", "ridge · 9 studies"). Current pins show only the short uppercase label. Cosmetic gap, orthogonal to contours.
- **Paper vignette.** Radial gradient overlay softening the map's edges under the kiosk rails (`trailhead-kiosk.jsx:26–29`). One-div addition in `TrailheadKiosk/index.astro`.
