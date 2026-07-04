# Park-Map Redesign — Implementation Plan

**For:** a fresh Claude (Opus/Sonnet) session started in `korabeland.com/` (memory scope matters — start here, not the parent repo).
**Branch:** `redesign/park-map` (already created; first commit `99bf1f7` carries Korab's uncommitted hero-image/list-styling WIP so redesign commits stay clean).
**Approved direction:** https://claude.ai/code/artifact/d407a06c-9c01-4b7f-ba92-ec63fda9fe1a — Korab approved **all recommendations** (Decisions A, B, C + kill list). Do not re-litigate them.

## North star

**"Linear draws a national park map."** Keep the trail-map metaphor; execute it as a precision instrument. Product design leads (grid, restraint, product-grade defaults); cartographic details follow, and **every mark must carry real information** (Imhof's test — decorative topography that encodes nothing is the source of the current "gimmick" feel). One visual system across homepage and interior pages. Motion budget: exactly three signature moments, compositor-only, reduced-motion safe.

## Root-cause findings (verified in code — trust these, they save you an audit)

1. **The desktop map ugliness is a compositing bug, not a rendering bug.** `src/components/TrailheadKiosk/MapSurface.astro` already renders the refined map (d3-contour marching squares, index/intermediate line weights, legend, scale bar, compass). The kiosk then blows it up as a background texture via `transform: scale(1.45)` ([TrailheadKiosk/index.astro:76](../../src/components/TrailheadKiosk/index.astro)) plus a vignette — scaling strokes 1.45× is what reads "heavy and blobby." Mobile (<1040px) shows it unscaled, which is why mobile looks right. **Fix composition, keep the pipeline.**
2. **Trails are rough.js** (`MapSurface.astro:194-204`, roughness 2.0, bowing 1.6) — the sketchy wobble undercuts precision. Memory `feedback_rough_js_bloat.md` also flags rough.js HTML bloat. Replace with clean paths.
3. **Fabricated data violates the north star.** `RightRail.astro` hardcodes "42 entries", "9 case studies", "new · 2 added", "most walked"; `LegendStrip.astro` has "last walker: 2h ago"; RightRail has "elev. 412m". Real counts are available via `src/lib/posts.ts` (`listPosts`) and `src/lib/projects.ts`. Derive or delete every number.
4. **Typography split-personality:** Fraunces (the fashion-serif) is `--font-display` in `src/styles/tokens.css:45`, loaded via Google Fonts `@import` at `src/styles/global.css:1`, also consumed by `src/pages/og.png.ts` (via `@fontsource/fraunces` files for satori) and `src/components/OffTrail/OffTrail.astro`. Interior pages set 72px Fraunces displays (`src/pages/notes/index.astro:42-44`) while the homepage speaks mono/kiosk.
5. **Craft leaks:** the "connects to" KnowledgeGraph panel clips labels off the right viewport edge on post pages (island logic in `src/components/KnowledgeGraph/KnowledgeGraph.tsx` — not yet audited, investigate there); the projects empty state is centered serif ("The grove is quiet for now") on a left-aligned site; tape corners (`TapeCorner.astro`) and ±0.6° card rotations read craft-project.
6. **What's already good — don't rebuild:** OKLCH token system with palettes/day-states (`tokens.css`), WCAG-tuned contrast (see comments in `tokens.css:32-34` and `global.css:34-37` — preserve AA), sharp radii, global reduced-motion guard (`global.css:189-200`), skip link, focus ring, sr-only nav duplicate for the map, byte-stable build-time map generation, `gen-trail-register.ts` colophon build log.

## The system (Decision A — approved)

- **Type:** Schibsted Grotesk (display + body; weights 400/500/700 + italic 400) and JetBrains Mono (400/500, metadata/labels — unchanged). **Fraunces and Inter Tight leave entirely.** Cartographic grammar: grotesk = structure; mono = coordinates/metadata; *italic reserved for place names* (the water-features convention) — e.g. route destinations ("the upper forest"), never for emphasis or decoration.
- **Tokens:** keep the OKLCH palette system as-is. Only `--font-display` / `--font-body` change. Note `tokens.css` header says token changes flow through DESIGN.md first — Phase 1 does exactly that.
- **Numerals:** `font-variant-numeric: tabular-nums` wherever digits align (dates, stats, datum lines).
- **Motion budget (Decision — approved):** the three signature moments in Phase 5 and *nothing else new*. Existing ping/breathe on you-are-here stays (it's one of the three, refined). High-frequency actions (nav, hover) never animate beyond 150-200ms transitions.

## Phases

Each phase = one commit (conventional commits). Run `pnpm verify` before every commit; run the full gate (Phase 7) before the PR. Dev server: `pnpm dev` (port 4321; `.claude/launch.json` exists for preview tooling).

### Phase 1 — Spec + typography foundation
`feat(design): cartographic type system — retire Fraunces`

1. Rewrite `../DESIGN.md` (parent repo — commit it separately with `git -C ..` since this repo must not commit parent files). Replace the stale 2026-03-28 spec (Inter/amber, "three decorative elements") with: north star, token table (copy current OKLCH values from `tokens.css`), the type grammar above, motion budget, component inventory (map chrome: legend / scale bar / plate numbering / graticule ticks / collar footer / benchmark ⌖ / elevation profile), kill list, a11y rules (keep existing AA notes).
2. `src/styles/global.css:1`: swap the Google Fonts import to `family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;500`. Remove `font-feature-settings: "ss01","ss02"` (Inter-specific).
3. `src/styles/tokens.css:45-46`: `--font-display: "Schibsted Grotesk", system-ui, sans-serif;` (same for `--font-body`). Keep `--font-mono`.
4. Rework the type helper classes in `global.css` rather than deleting them (they're used across components): `.t-display` → 700 grotesk, tight tracking, no `font-variation-settings`; `.t-serif` → 400 grotesk; `.italic-serif` → italic 400 grotesk, **rename usage mentally to "place-name italic"** — audit each usage site and keep it only where a place/route/thing is named; `.lede` → italic 400 or regular 400 muted (taste call); `.pullquote` stays italic (it quotes). Sizes: displays drop roughly a third (didone 72px → grotesk ~44-52px reads equivalent).
5. `src/pages/og.png.ts`: replace the `@fontsource/fraunces` WOFF read with `@fontsource/schibsted-grotesk` (add dep, remove fraunces dep — `package.json` is orchestrator-only per AGENTS.md §3, so do this in the main session, not a subagent). Update the OG layout text styles to match.
6. `src/components/OffTrail/OffTrail.astro`: repoint any Fraunces-specific styling.
7. Verify: `rg -i fraunces` returns nothing; `pnpm verify`; screenshot `/` and `/notes` — headings must render Schibsted (check computed `font-family`, not pixels).

### Phase 2 — The map (Decision B — approved)
`feat(map): content-derived topography, clean trails, one rendering`

All in `src/components/TrailheadKiosk/MapSurface.astro` (keep the file; it's well-built):

1. **Content-derived elevation field.** Replace the pure-FBM+plateau field (lines 70-85) with: for each destination (notes / projects / work-with-me), a Gaussian peak at its pin position whose height scales with real content volume (`listPosts().length` for notes; `src/lib/projects.ts` count for projects; `siteMeta.slotsAvailable` for work), plus the central trailhead plateau, plus low-amplitude FBM detail (~0.15) for natural texture. Keep the existing seeded determinism (FBM_SEED, FNV-1a) and the edge-band sink (lines 102-112) — byte-stability now depends on content counts, which is correct: *the map changes when the territory changes.* Document the mapping in a comment block — this is the "geography means something" requirement.
2. **Clean trails.** Delete the rough.js import and `gen.line` usage; draw each trail as a single quadratic Bézier (slight perpendicular bow, ~8-12px at midpoint, deterministic per slug) with the existing CSS dash. Add `pathLength="100"` to each trail path (Phase 5 uses it). After this, `rg "roughjs|rough\.js" src` should only hit comments; if nothing else imports it, remove the `roughjs` dep.
3. **Contour discipline:** keep 13 levels, index-every-4th. Optionally thin intermediate strokes to 0.6-0.7 and keep index at 1.1 — compare visually at the *final* rendered size (no more 1.45× scaling) before choosing.
4. Add elevation labels on 2-3 index contours (tiny mono text on a paper-colored gap rect, like real maps) — heights derived from the content field, so the numbers are honest (e.g. label = level index × 20m).
5. Keep legend / scale bar / compass exactly as structured, they're right. Add `transition:name="you-are-here"` handling later (Phase 5 touches this file again).

### Phase 3 — Homepage (Decision C — approved)
`feat(home): Unigrid layout — one focal point`

Rebuild the composition in `src/pages/index.astro` + `TrailheadKiosk/` (rename or restructure as you see fit; TrailheadKiosk can become the map-hero component):

1. **Identity band** at top: full-width strip, `--ink` background, paper text, 3-4px `--moss` bottom rule (the NPS Unigrid black band). Content: wordmark "korab eland" (grotesk 700), tagline from `siteMeta.tagline` in place-name italic, right-aligned mono meta (`est. 2019 · rev. YYYY.MM.DD`). This replaces the LeftRail masthead card. Sits directly under the site chrome; on the homepage the chrome and band can merge into one unit if that reads cleaner.
2. **Map as the single hero**: MapSurface framed (its own border), unscaled, full content width, `~56-62vh` tall. No overlaid cards, no vignette. You-are-here is the only animated element. The three trail pins ARE the primary navigation moment.
3. **Route panels below**: one row (grid, 4-up desktop / 2-up tablet / 1-up mobile) replacing RightRail's stacked cards. Keep RouteCard's information design (eyebrow / title / sub / stats rule) but: **no rotation, no tape, no shadow**; square hairline cards; title in grotesk 500 with the destination in place-name italic (e.g. "field notes — *the upper forest*"); **all stats derived from real data** (post count, projects count or "first survey underway", slots from siteMeta, computed read-time ranges). Delete the tag badges unless derivable.
4. **Datum line**: merge WeatherPill + today's-entry status into one mono strip under the panels or in the collar (Phase 4): `taking N clients · clear · 52° · rev 2026.07.03`. Today's-entry prose block moves down the page (keep it — it's human and true — as a small "§ today's entry" module beside HomeNow's columns, no tape corner, no blinking caret).
5. Kill: `TapeCorner.astro` (delete file), vignette, `scale(1.45)` backdrop wrapper, LegendStrip's "last walker: 2h ago", RightRail's "elev. 412m" (or derive it from the field at CX,CY — honest version allowed), roman-numeral year footer (`index.astro:32-60` — replace with the collar, Phase 4).
6. `HomeNow/index.astro`: keep the three-column now-block; placeholder PROJECTS array can stay (content is Korab's job) but make the *counts* elsewhere real.

### Phase 4 — Interior unification
`feat(interiors): plate system, collar footer, nav joins the map`

1. **Plate eyebrows:** replace `§ field notes` etc. with mono `PLATE II · FIELD NOTES` (home = I, notes = II, projects = III, work = IV, colophon = V — fixed mapping, document in DESIGN.md). One shared component, e.g. `src/components/PlateHeader/` (new subfolder — parallel-safe zone).
2. **Page headers:** `notes/index.astro`, `projects` index, `colophon.astro` — grotesk 700 titles at the new scale, place-name italic only where a place is named. Left-aligned everything.
3. **Collar footer** in `BaseLayout.astro`: replace the current footer with the map-collar: top hairline in `--ink`, mono line with `korabeland.com · surveyed 2019 · revised {buildStamp} · colophon`, plus a small scale-bar SVG. Give the homepage the same footer (delete its custom one; remove `hideFooter` usage).
4. **Nav:** mono 11px uppercase labels (matches `.t-label`), active state = moss underline (keep), plus the you-are-here dot glyph next to the active item — nav becomes a legend row, tying chrome to map.
5. **Graticule ticks:** faint margin tick marks (CSS background or tiny SVG) on interior page shells — subtle, `--rule` color, don't fight the text.
6. **Fix the KnowledgeGraph clipping** (labels overflow viewport right edge on `/notes/[slug]`): audit `KnowledgeGraph.tsx` sizing; constrain the collapsed stage to its container width.
7. **Empty states:** projects page — left-aligned, on-metaphor, useful: mono eyebrow + "No case studies logged yet — the first survey is underway." + mailto line. Same pattern for notes-empty.

### Phase 5 — The three signature moments
`feat(motion): route draw, camera pan, elevation profile`

1. **Routes draw themselves.** Trails (with `pathLength="100"`) animate `stroke-dashoffset` 100→0 via CSS scroll-driven animation (`animation-timeline: view()`), wrapped in `@supports (animation-timeline: view())` — fallback is the static drawn state (set the final state outside the @supports block; the animation only adds the reveal). On the homepage hero (visible on load) use a one-shot keyframe instead of a scroll timeline. Replace the perpetual `trail-drift` dash crawl — one deliberate draw beats an infinite loop.
2. **Camera pans between pages.** Add `<ClientRouter />` (from `astro:transitions`) to `BaseLayout.astro` head. `transition:persist` on the map surface where it appears on multiple pages; `transition:name="you-are-here"` on the you-are-here marker in MapSurface AND on MiniMap's current-location dot in `src/components/MiniMap/MiniMap.astro` — the dot morphs across navigation. Keep durations ≤400ms; pre-size both elements to avoid CLS. Test keyboard nav + browsers without the API (it no-ops gracefully).
3. **Elevation profile reading progress.** New component `src/components/ElevationProfile/` replacing the reading-depth bars in ReadingRoom's left sidebar: small SVG route profile (deterministic from slug hash), filled via `animation-timeline: scroll()`; summit ⌖ marker at 100%. `@supports` fallback: static profile with a plain percentage. Reduced-motion: the global guard (`global.css:189`) already forces 0.001ms durations — verify it covers scroll-timeline animations; if not, add `@media (prefers-reduced-motion: reduce)` setting `animation-duration: 1ms` on these specifically (do not delete the rule — some engines mishandle missing durations).

### Phase 6 — Quiet-craft details
`feat(craft): product-grade defaults`

- `::selection { background: var(--moss); color: var(--paper); }` in global.css (check dusk palette contrast too).
- `font-variant-numeric: tabular-nums` on `.t-mono`, `.t-label`, stats rows, dates.
- Gate every hover-only affordance with `@media (hover: hover)` (route cards, nav, pins).
- Copy-email button on colophon/off-trail: inline "copy" → "copied" state swap (~1.5s revert), no toast. Tiny inline script or the existing island pattern — no new dependency.
- Trust timestamps: "updated {date}" on post pages from frontmatter (Keystatic schema may need an `updatedAt` — `keystatic.config.ts` is orchestrator-only, edit in main session).
- Any input (if/when forms exist): ≥16px font-size.
- Skip: ⌘K gazetteer — out of scope for this pass (note it in DESIGN.md as planned).

### Phase 7 — Verification gate + PR
`test(visual): reset baselines for park-map redesign`

1. `pnpm verify` (biome + tsc) — zero errors.
2. `pnpm test` (vitest) — some tests may assert Fraunces/old markup; update assertions to the new system, don't delete tests.
3. `pnpm test:visual` — baselines WILL fail (intentional redesign). Review each diff deliberately, then regenerate (`playwright test --update-snapshots`). Precedent: commit `aae341b`.
4. `pnpm audit` (Lighthouse CI + axe) — must pass. Watch: font swap (two families now, should be net-neutral), View Transitions CLS (keep <500ms, pre-sized), scroll-timeline animations are compositor-only.
5. Manual sweep at 375px / 768px / 1280px, light + dusk (`[data-time="dusk"]`), `prefers-reduced-motion: reduce`, keyboard-only navigation.
6. Screenshots of every page desktop+mobile for the PR body. Push branch, open PR to `main` (use the `ship` skill if available). Do NOT merge — Korab reviews.

## Acceptance checklist (the PR description should tick every box)

- [ ] One map rendering at all breakpoints; no scale-up hack; no vignette
- [ ] Zero rough.js in the map; trails are clean curves with `pathLength=100`
- [ ] Map elevation derives from real content counts (documented in code)
- [ ] Zero fabricated numbers anywhere (grep the old strings: "42 entries", "9 case studies", "last walker", "412m")
- [ ] Fraunces and Inter Tight fully removed (imports, tokens, og.png.ts, deps)
- [ ] Italic appears only on place names / quotes
- [ ] Tape corners and card rotations deleted
- [ ] Homepage: band → map → panels → now; single focal point
- [ ] Plate eyebrows + collar footer on every page, including home
- [ ] Exactly three motion moments; all `@supports`-guarded and reduced-motion safe
- [ ] KnowledgeGraph no longer clips; empty states left-aligned and on-metaphor
- [ ] `pnpm verify:all` green; axe + Lighthouse budgets pass
- [ ] DESIGN.md (parent repo) matches what shipped, committed via `git -C ..`

## Constraints & gotchas

- **AGENTS.md §3 ORCHESTRATOR-ONLY paths** (package.json, keystatic.config.ts, astro.config.mjs, barrels, .claude/) — edit only from the main session; never from parallel subagents. Barrel files (`src/components/index.ts`) are generated — run `pnpm gen:barrels` after adding/removing component folders.
- **Preserve the WCAG AA contrast work** — `--ink-mute` vs `--ink-soft` usage rules are documented in tokens.css/global.css comments; keep small mono text on `--ink-soft`.
- **Dusk palette:** every new color pairing must work under `[data-time="dusk"]` (dark). The identity band (`--ink` bg) inverts there — use tokens, never raw hex.
- **`predev`/`prebuild` run `gen-trail-register.ts`** (git log → colophon). Unaffected by this redesign; don't touch it or `commits.seed.json`.
- **Astro 6 + `@keystatic/astro@5`** peer-dep mismatch is a known, accepted state. TypeScript stays `^5`.
- Keystatic posts live at `src/content/posts/*/index.mdoc` (trailing-slash collection path is locked).
- Commit style: `type: description`, one logical change per commit, end with the Claude co-author trailer.
