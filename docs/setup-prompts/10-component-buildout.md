# Prompt 10 — Component build-out (object-first, MVP-narrowed)

**Phase:** 3 (Content and design)
**Depends on:** Prompts 8 & 9 complete (DESIGN.md exists with MVP overlay; content architecture wired).
**Revised:** 2026-04-19 per `/office-hours` doc. Replaces the original 3-wave parallel component buildout with a 14-step **object-first** build order. The map surface is the craft centerpiece — everything else assembles around an already-mirror-sheen object. The original wave plan is retained in the **Post-launch wave** appendix at the bottom.
**Expected outcome:** `MapSurface.astro` passes the mirror-sheen audit gate at `/_dev/kiosk`, `TrailheadKiosk` composes cleanly at `/`, `/colophon` ships as MDX, `/off-trail` catches unlinked trail clicks, `pnpm verify:all` is green.

---

## Paste into Claude Code

```
Build the MVP launch surface in strict object-first order per the
2026-04-19 office-hours doc. Do NOT parallelize these steps — each gate
prevents advancing until the prior surface is verified.

File-ownership reminder: orchestrator owns package.json, astro.config.*,
keystatic.config.ts, tsconfig.json, .env*, every barrel file, everything
under .claude/, scripts/gen-trail-register.ts, and
src/content/trail-register/commits.seed.json. Subagents request changes
to those; they never edit directly. Each ui-builder invocation owns
exactly one subfolder under src/components/.

Step 1 — Orchestrator prep (commit 1):
  - pnpm add roughjs
  - Verify the import line works at install time: import rough from
    "roughjs/bundled/rough.cjs.js". If the installed version exports a
    different shape, pin the working version in package.json.
  - Confirm the 2026-04-19 domain search-and-replace pass already ran on
    DESIGN.md, docs/design/tokens.css, src/styles/tokens.css (korab.land →
    korabeland.com). If not, run it now in this commit.
  - Create src/pages/404.astro if it doesn't exist, per the DESIGN.md 404
    spec (mini TrailMap with dimmed pin, italic Fraunces dek, button back
    to /). Required as a prerequisite for step 3's guard.
  - Ensure the scripts/gen-trail-register.ts prebuild hook from Prompt 9
    is wired and commits.seed.json is committed.
  - Remove src/pages/blog/ (or gate with a 404) — not a launch route.

Step 2 — ui-builder: src/components/TrailheadKiosk/MapSurface.astro ONLY.
  Owner: ui-builder, subfolder src/components/TrailheadKiosk/.
  - Frontmatter (server-side): import rough from
    "roughjs/bundled/rough.cjs.js". Use rough.generator() to emit SVG
    path strings at build time. RNG seeded per-trail via
    seededRandom(trail.slug) so Playwright baselines are byte-stable.
  - Render: contour rings (5–7 concentric, geometric spacing, regular
    stroke --rule, index stroke --ink-mute), exactly 3 dashed rough-js
    trails to /notes, /projects, /work-with-me (roughness 1.5–2.5, bowing
    ≥ 1, angles separable by ≥ 30°), 3 destination pin label boxes with
    .t-mono labels, YOU-ARE-HERE marker with radar-ping keyframe
    (3.2–4.8s linear infinite), breathing 6px moss dot (3.5s breathe
    ease-in-out infinite, halo --moss-soft → transparent), legend, scale
    bar.
  - Zero client JS. Motion in CSS only.
  - @media (prefers-reduced-motion: reduce) disables radar-ping, breathe,
    and trail-drift; static end-state still renders.

Step 3 — ui-builder: src/pages/_dev/kiosk.astro.
  Owner: ui-builder (consumes MapSurface).
  - At top of frontmatter:
    if (import.meta.env.PROD) return new Response(null, { status: 404 });
  - Orchestrator separately adds /_dev/* to robots.txt disallow and
    passes filter: (page) => !page.includes("/_dev/") to @astrojs/sitemap
    in astro.config.mjs.
  - The page renders MapSurface at 1280px width with a page title
    "MapSurface — audit preview".

Step 4 — Audit gate #1: mirror-sheen checklist (reviewer subagent).
  Owner: reviewer subagent, read-only.
  All 10 items must PASS — any FAIL loops back to step 2:
    1. rough.js roughness 1.5–2.5, bowing ≥ 1.
    2. 5–7 concentric contour rings with geometric spacing.
    3. Exactly 3 trails at separable angles (≥ 30° between any two).
    4. 3 pin label boxes rendering: "notes", "projects", "work with me".
    5. YOU-ARE-HERE marker centered; radar-ping 3.2–4.8s linear infinite.
    6. Moss dot 6px fill, breathe 3.5s ease-in-out infinite, halo
       --moss-soft at 0% → transparent at 50%.
    7. Legend and scale bar present.
    8. @media (prefers-reduced-motion: reduce) disables radar-ping,
       breathe, trail-drift — static end-state still renders.
    9. Playwright baseline captures at 375/768/1280/1920; two consecutive
       runs diff ≤ 0.01% (confirms RNG seed stable).
   10. Bundle budget: zero net-new client-JS chunk attributable to
       MapSurface (diff dist/_astro/*.js manifest against an empty
       Astro page). Rendered HTML delta ≤ 20 KB gzipped.
  - Output: docs/reviews/<date>-mapsurface-audit.md committed. Launch
    checklist (Prompt 13) verifies this file exists.

Step 5 — ui-builder: TrailRegisterRail.astro.
  Owner: ui-builder (same subfolder — src/components/TrailheadKiosk/).
  - Reads src/content/trail-register/commits.json (generated by
    scripts/gen-trail-register.ts in the prebuild hook; falls back to
    commits.seed.json on shallow clone).
  - 14 entries max. Each row: short SHA in --moss, subject line mono
    --ink-soft, ISO date mono --ink-mute.
  - No scrollback at MVP.

Step 6 — ui-builder: PopularRoutesRail.astro.
  Owner: ui-builder (same subfolder).
  - Two hand-picked entries only:
    trailhead → colophon     href="/colophon"
    trailhead → field notes  href="/off-trail?from=notes"
  - .t-mono footer: "more routes coming as the map fills in."

Step 7 — ui-builder: WeatherPill primitive in src/components/WeatherPill/.
  Owner: ui-builder (new subfolder).
  - Takes a `status` string prop. Renders 6px moss dot with breathe halo
    + .t-mono text ≤ 11px.
  - MVP parent passes the string literal "clear · 52°f · taking clients".
    No weather API, no runtime fetch at launch.

Step 8 — ui-builder: TrailheadKiosk/index.astro.
  Owner: ui-builder (same TrailheadKiosk subfolder).
  - Composes MapSurface + TrailRegisterRail + PopularRoutesRail + legend
    strip + WeatherPill into the full kiosk layout per DESIGN.md §Home-
    hero variants (kiosk variant).

Step 9 — Orchestrator: src/pages/index.astro.
  Owner: orchestrator (routes are not subagent-owned).
  - Wires BaseLayout.astro + Chrome + <TrailheadKiosk />.
  - NowSection is EXPLICITLY out of scope for this PR — kiosk hero fills
    the viewport at launch.

Step 10 — content-writer: src/pages/colophon.astro.
  Owner: content-writer subagent.
  - MDX-driven. Pulls bio + influences from identity/ in the parent repo.
  - Sections: bio blurb → influences list → tools/stack → contact line
    (mailto:hello@korabeland.com).
  - Respect DESIGN.md type scale and spacing. Single-column
    ReadingRoom.center width (620px measure).

Step 11 — ui-builder: src/pages/off-trail.astro.
  Owner: ui-builder.
  - Reuses the 404 component spec exactly. Reads ?from= query param and
    renders the matching destination label.
  - Valid from= values: notes, projects, work-with-me. Unknown values
    fall back to generic "this path hasn't been mapped yet" copy.

Step 12 — ui-builder: wire unlinked trail clicks in MapSurface.
  Owner: ui-builder (edit MapSurface).
  - Each trail destination pin wrapped in
    <a href="/off-trail?from=<slug>"> around the pin SVG group.
  - Duplicate screen-reader <a> links exist elsewhere on the page per
    DESIGN.md a11y spec (do NOT rely only on SVG text for SR users).

Step 13 — Orchestrator: run pnpm verify:all green.
  - Biome + tsc + Vitest + Playwright visual (baselines committed) +
    Lighthouse CI + axe.

Step 14 — Orchestrator: open the launch PR.

Commit each step as its own commit (or each logical group) — do not
squash. The PR body is generated by the post-push hook from Prompt 11.
```

---

## Why object-first

The original 3-wave parallel plan assumed every component in the DESIGN.md inventory would ship at launch — BlogCard, ProjectCard, Hero, layouts, all of it. The MVP narrowing makes most of that irrelevant. What's left is a small number of components that all orbit the MapSurface. If MapSurface isn't mirror-sheen, nothing downstream matters. Building it in isolation at `/_dev/kiosk` — gated by the audit checklist — prevents the craft budget from getting burned on chrome and rails before the centerpiece is right.

## What to watch for

- Step 1 is the only place `roughjs` gets added to `package.json`. If a subagent tries to `pnpm add` it, that's a file-ownership violation — redirect to orchestrator.
- Step 4's pixel-stability check is the single most important gate. If two consecutive `pnpm test:visual` runs diff > 0.01 %, the RNG seed isn't actually deterministic and step 2 has to be revisited.
- Step 4's bundle budget is also non-negotiable. `rough.js` must stay server-side. If any part of it leaks into a client chunk, the import path is wrong.
- Step 9's note on `NowSection` — it is **not shipping at launch**. Do not let the `src/pages/index.astro` rewrite smuggle it in.
- Step 12 pin wrapping — the trail pins are the only interactive surface on `MapSurface`. If screen-reader duplicates aren't present elsewhere, axe will flag it.

## Red flags to push back on

- "Let's parallelize steps 5, 6, 7" — no, they all land in `src/components/TrailheadKiosk/` or adjacent folders owned by `ui-builder`. Run sequentially.
- Skipping the audit gate #1 artifact — that file is a launch checklist item.
- Wrapping the kiosk map in a client-rendered React island — server-only, zero hydration.
- Adding a weather API fetch to `WeatherPill` — MVP is a static string prop. Real data is deferred.
- Wiring `/notes`, `/projects`, or `/work-with-me` pages as real routes — they are map pins that link to `/off-trail?from=<slug>`.

## Checkpoint: the review page

After step 13 succeeds, the reviewer subagent produces the six-element review page (per `07-subagent-roster.md`):

1. Vercel preview URL with QR code.
2. Screenshot gallery at 4 viewports (`/`, `/colophon`, `/off-trail`).
3. Video walkthrough (Playwright-captured of the kiosk + colophon).
4. Mirror-sheen audit artifact link (`docs/reviews/<date>-mapsurface-audit.md`).
5. Before/after diff against the last committed baseline.
6. Plain-English markdown summary.

Review on phone + desktop. If the map doesn't read as a real object, iterate on `MapSurface.astro` (not on chrome or rails).

---

## Post-launch wave appendix (deferred from the original Prompt 10)

Kept for post-launch execution. **Do not touch during the MVP PR.** The components below ship when `/notes`, `/projects`, or `/work-with-me` come online.

### Wave 1 (leaves — no dependencies)
- `Button` variants, `Badge`, `Card` primitives, `Input` / `Textarea`, `Tag`, `SectionMarker`, `RuleSoft`, `Figure`, `MarginNote`, `PullQuote`, `Footer`, `Reveal` utility — most of the Shared primitives from DESIGN.md §Component inventory that haven't been touched yet.

### Wave 2 (composed)
- `BlogCard`, `ProjectCard`, `Chrome` nav (only if not already shipped alongside `index.astro`), `DropCap`, `KnowledgeGraph`, `NextInSeries`, `ArticleHero`, `FactStrip`, `FieldLogEntry`, `OutcomeStat`.

### Wave 3 (page-level)
- `FieldNoteIndex`, `ProjectIndex`, `ReadingRoom`, `CaseStudyShell`, `AvailabilityCard`, `SlotsIndicator`, `WorkWithMePage`, `CaseHero`.

Between each wave the orchestrator runs `pnpm gen:barrels` and commits. The original concurrency rules from the pre-2026-04-19 version of this prompt apply inside the post-launch waves — dispatch `ui-builder` agents in parallel git worktrees, one agent per component subfolder, never two agents in the same subfolder simultaneously.
