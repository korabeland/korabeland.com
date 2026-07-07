---
title: "feat: Console UX enhancements — provenance, relocation, shift toggle, shift log"
type: feat
status: active
date: 2026-07-06
origin: docs/brainstorms/2026-07-06-ux-enhancement-ideas-requirements.md
deepened: 2026-07-06
---

# feat: Console UX enhancements — provenance, relocation, shift toggle, shift log

## Summary

Ship four enhancements from the UX brainstorm: metric provenance footnotes on case-study outcome blocks (origin R2, substituted for the plotted portrait R1, which Korab cut during planning), the relocation readout replacing stale Melbourne copy plus a wholesale llms.txt rewrite (origin R5), the night/day shift toggle activating the dormant `[data-time="day"]` tokens (origin R7), and a GitHub contribution grid on the colophon fed by a build-time GraphQL fetch with committed seed fallback (origin R9). All four follow the house pattern: server-render the static end-state, enhance with inline JS, keep every number real.

---

## Problem Frame

The site is the application-facing front door for an active job search, but it still tells hiring managers the wrong location, makes credibility claims ("every number real") that a visitor cannot verify, carries a fully-specced day palette that nothing activates, and has no visible signal of ongoing building activity. See origin document for the full framing.

The plotted portrait (origin R1) was selected initially, then cut by Korab during planning as unnecessary; origin R2 (metric provenance) was substituted as the highest value-to-effort remaining candidate.

---

## Requirements

Origin R-IDs are used throughout this plan.

- **R2. Metric provenance** — every number in a case-study outcome metrics block gets a hover/tap footnote stating how it was measured, over what period, and what counted. No metric ships without provenance content (origin AE4).
- **R5. Relocation readout** — hero and structured data stop claiming Melbourne as the plain story; the mono readout `⌖ melbourne → easton, md · us citizen · no sponsorship needed` corrects the screening gap. Scope grew during planning to a wholesale `public/llms.txt` rewrite (the file also advertises routes that don't exist and stale positioning).
- **R7. Shift change toggle** — console-styled control (`shift: night`) switching between the existing night (default `:root`) and day (`[data-time="day"]`) palettes; default derived from visitor local time; explicit choice persisted; both palettes hand-tuned (already true in `src/styles/tokens.css`).
- **R9. Shift log** — GitHub contribution grid in console grammar (amber-scaled cells, mono summary stats) on the colophon beside the build log; real data fetched at build time with a committed seed fallback; a failed fetch never fails the build (origin AE3).

**Origin acceptance examples carried:** AE3 (covers R9), AE4 (covers R2). AE1/AE2 covered origin R1, which is out of scope.

---

## Scope Boundaries

- **Origin R1 (plotted portrait) is cut** — Korab's call at planning time ("unnecessary"). The research for it (line-art pipeline, LCP occlusion mechanics) is preserved in origin + this plan's Sources for a future revisit; nothing in this plan depends on it.
- Origin R3, R4, R6, R8, R10 are not in this plan (origin caps the shipped subset at 3–4).
- No portfolio-site (korabeland.github.io) work.
- Origin rejections stand: no command palette, no self-tailoring console, no terrain/ignition commit visuals.
- R7 ships the binary night/day pair only — `tokens.css` defines exactly one alternate state (`[data-time="day"]`, verified), no dawn/dusk variants are invented.
- R9 renders public contribution counts only (what a hiring manager can verify on github.com), not private activity.
- No new animation moments: the motion budget (parent `Personal_Brand/DESIGN.md` §5, currently five approved moments) is unchanged. The shift swap is an instant token flip; the count-up and existing moments are untouched.

### Deferred to Follow-Up Work

- Periodic refresh of the contribution seed JSON: manual, added to the ship/maintenance checklist rather than automated in this plan.
- Day-shift visual screenshot baselines: day coverage is axe-only initially (matching the "screenshots test the static-default path" convention); a day baseline set can be added later if day-shift regressions actually occur.

---

## Context & Research

### Relevant Code and Patterns

- `src/pages/index.astro` — hero is inline in the page (no Hero component): eyebrow line 68, portrait caption `⌖ melbourne` line 90, JSON-LD `Person.address` line 34. House JS-animation pattern (rotating word, lines 169–189): server-rendered static default, inline script, `matchMedia("(prefers-reduced-motion: reduce)")` self-disable.
- `src/pages/about.astro` line 53 — second portrait caption with `⌖ melbourne`.
- `src/styles/tokens.css` — night tokens on `:root`; complete day palette under `[data-time="day"]` (lines 75–87) including re-pinned focus ring. Nothing sets `data-time` anywhere yet. Header rule: token changes flow through DESIGN.md first. All site colour flows through CSS vars (`--paper`, `--ink`, `--amber`, `--moss`, `--rule`), so the attribute swap restyles every surface without component changes.
- `src/layouts/BaseLayout.astro` — site chrome; hardcoded `<meta name="theme-color" content="#16181c">` at line 105.
- `scripts/gen-trail-register.ts` + `src/content/trail-register/commits.seed.json` — the exact template for R9's pipeline: prebuild script writes gitignored JSON, falls back to committed seed on any failure, build never fails. Wired via `predev`/`prebuild` in `package.json`. Consumer `src/pages/colophon.astro` `loadCommits()` (lines 21–35) reads generated-then-seed at prerender time.
- `src/pages/colophon.astro` — prose article, 620px measure; "Build log" section conditionally renders when commits exist. R9's grid slots as a sibling section.
- `src/components/CaseStudy/OutcomeMetrics.astro` — R2's target: bordered label/value rows, count-up enhancement, reduced-motion-safe. Metrics come from the Keystatic `projects` collection `outcomeMetrics` array (`value`, `label`) via `src/lib/projects.ts`. Two entries exist: `src/content/projects/ai-sms-pilot/`, `src/content/projects/lead-scoring/`.
- `src/lib/metric-countup.ts` + `tests/metric-countup.test.ts` — the "pure logic split" pattern: parse/decide functions in plain `.ts`, Vitest with fixtures, DOM side stays in the component.
- Dev-preview recipe: `src/pages/dev/experience-preview.astro` — `prerender = false`, PROD guard returns 404, `robots.txt` + sitemap already exclude `/dev/`. (Never `_dev/` — Astro drops underscore page dirs entirely.)
- `playwright.config.ts` — reduced motion emulated globally via `use.contextOptions.reducedMotion` (NOT the top-level key; silently ignored in Playwright 1.59). Static end-state is the tested path. Projects: 4 viewport screenshot runs, `a11y` (axe), `seo`, `e2e`. Runs against real `pnpm dev`.
- `tests/visual/seo.spec.ts` — asserts JSON-LD per route (Person node asserted, address not — R5 extends this).
- `.lighthouserc.json` — gates `/` and `/colophon`: perf ≥ 0.9, a11y ≥ 0.95, LCP ≤ 2500ms, CLS ≤ 0.1. R9 lands on a gated page.
- `.github/workflows/ci.yml` — injects `secrets.CHROMATIC_PROJECT_TOKEN`; the established pattern for providing a `GITHUB_TOKEN` secret to CI. Vercel builds need the token in project env (no in-repo precedent yet — R9 is the repo's first build-time network call).

### Institutional Learnings

- Trail-register seed on Vercel: shallow clones mean **production has served the seed permanently** — the fallback silently becomes the primary path. R9 therefore needs a visible staleness signal, not just a fallback.
- Colophon visual baselines already drift whenever git log changes; the custom pixelmatch harness self-seeds ("delete the baseline to update") and CI wipes baselines before `test:visual`, leaning on Chromatic for cross-run regression.
- AstroContainer is broken under this Vitest/Vite pairing — content-gated `.astro` testing goes through `/dev/` preview routes + Playwright.
- The global reduced-motion CSS kill-switch does not stop JS-driven mutation — every script needs its own `matchMedia` guard.
- Site ships zero framework client JS by design — enhancements are inline `<script>`, not React islands.
- No `localStorage`/`sessionStorage` usage exists anywhere in the repo yet — R7 persistence is greenfield; wrap storage access in try/catch (private-mode/blocked-storage throws).

### External References

- GitHub GraphQL `contributionsCollection.contributionCalendar` — canonical 52×7 query; not deprecated (verified against the GraphQL breaking-changes page, July 2026); load-bearing for GitHub's own gh-skyline CLI. GraphQL always requires auth; a **fine-grained PAT with no additional permissions** suffices for public contribution data and grants nothing beyond public reads if leaked. 1 point per query against a 5,000/hr budget. `contributionLevel` comes free per day as an enum string (`NONE` through `FOURTH_QUARTILE`), corresponding to GitHub's own 0–4 intensity buckets.
- No official REST endpoint for the calendar exists (verified). Third-party proxies (jogruber.de) and the unauthenticated HTML endpoint work today but are contract-free scrapers — rejected as primary.
- Tailwind 4 CSS-first theming (`@custom-variant` / `@theme inline`) — researched and **not needed**: this site consumes tokens as raw CSS vars, so the `data-time` attribute swap alone restyles everything.
- Astro no-flash theme pattern: `is:inline` script in `<head>` before paint; cookie/SSR theming is unavailable because all public pages are `prerender = true`.

---

## Key Technical Decisions

- **R7 mechanism is an attribute swap, nothing more**: inline `is:inline` head script sets `document.documentElement.dataset.time` before first paint; all colour already flows through CSS vars. No Tailwind variant work, no component changes ("tokens swap, components don't" — locked in the console MVP plan).
- **R7 default/persistence model**: resolution precedence is `?shift=` query override → explicit `localStorage` choice → session-cached default → local clock (day = 07:00–18:59). The default is computed **once per session** (`sessionStorage`) so the theme never flips between page views mid-visit; the query override exists for deterministic tooling (Lighthouse, dev previews) and is never persisted. `prefers-color-scheme` is deliberately ignored — the default is the site's time-of-day conceit, not the OS setting (document this in DESIGN.md). All storage access try/catch-wrapped; any throw → night default.
- **R7 keeps browser chrome coherent**: the head script and the toggle handler also rewrite the `theme-color` meta (night `#16181c` / day paper value from tokens). The OG image (`src/pages/og.png.ts`) stays night — it is a brand card, not a themed surface.
- **R7 no-JS behaviour**: the toggle button is server-rendered `hidden` and revealed by script — no dead controls for no-JS visitors, who get the night default.
- **R9 data source**: GitHub GraphQL with a fine-grained zero-permission PAT (`GITHUB_CONTRIB_TOKEN`) read from `process.env` in the prebuild script (standalone scripts can't use `astro:env`). Response validated (`weeks.length ≥ 52`, day shape) before acceptance; any failure → committed seed + a loud build-log warning. Grid always carries a mono `data as of YYYY-MM-DD` caption sourced from a `fetchedAt` field in the JSON — staleness is visible whether the cause is a missing token, an expired token, or an aged seed.
- **R9 numbers derive from the API's own day buckets**: streak and busiest-week are computed from GitHub's UTC-bucketed days (matching what the public profile shows), not re-derived in local time. Summary stats are the accessible representation; the ~364-cell grid is `aria-hidden` decoration.
- **R9 placement**: colophon, beside the build log (per confirmed synthesis default) — keeps the Lighthouse-gated home page untouched.
- **R2 provenance is schema-enforced, not convention-enforced**: `outcomeMetrics` gains a required `provenance` text field in `keystatic.config.ts`; `src/lib/projects.ts` throws at build when a metric lacks it. AE4's "no metric ships without provenance" becomes a build failure, not a review reminder.
- **R2 disclosure pattern**: native `<details>/<summary>` per metric — the `<summary>` is the mono marker after the value (existing focus ring), the footnote row is the content. Keyboard, tap, and no-JS support come free from the element; JS only enhances (optional hover preview on pointer devices, aria refinements). No tooltip library, no island, no invented fallback.
- **R5 structured data stays factually true**: JSON-LD `address` keeps the current physical location until the move is real; `nationality: "US"` is added; relocation intent and work-authorization live in prose fields (`description`) and llms.txt. The arrow-form readout is the human-facing signal. (Confirmed direction in planning synthesis; exact copy still needs Korab's sign-off before merge — recorded as an origin assumption.)
- **R5 copy has two lengths**: full readout for the hero eyebrow area; short form (`⌖ easton, md` or similar) for the two tight portrait-caption flex rows. 375px wrap checked in review.
- **Test determinism for R7**: Playwright pins `data-time` (init-script/localStorage seed) so existing night baselines stay canonical; Lighthouse URLs in `.lighthouserc.json` pin `?shift=night` via the query override (verified: LHCI currently hits bare URLs with a fresh profile, so the audit palette would otherwise depend on the CI clock); a day-shift axe pass is added so both palettes are contrast-audited in CI regardless of runner clock (DESIGN.md §7 requires both shifts audited).

---

## Open Questions

### Resolved During Planning

- Which subset ships (origin blocking question): R2, R5, R7, R9 — Korab selected R1/R5/R7/R9, then cut R1 and accepted R2 as substitute.
- R7 persistence (origin deferred): localStorage + sessionStorage-cached default; cookies useless on fully prerendered pages.
- R7 states: binary night/day — verified only `[data-time="day"]` exists in tokens.css.
- R9 data source (origin deferred): GraphQL + fine-grained zero-permission PAT; proxies and HTML scraping rejected as primary.
- R9 placement: colophon (confirmed in synthesis).
- llms.txt: rewritten wholesale within R5, not just the location line.

### Deferred to Implementation

- R2 footnote micro-interaction (inline reveal vs. small popover; marker glyph): decide in-component against console grammar; both satisfy the test scenarios.
- R9 mobile treatment (horizontal-scroll breakout vs. truncated recent-weeks view): decide at 375px against the real grid.
- R7 exact day-boundary hours (07:00–19:00 proposed): trivially tunable in `src/lib/shift.ts`; confirm feel in review.
- Whether colophon screenshot flake needs a pixelmatch mask for the grid region: only determinable after observing a few `test:visual` runs with the grid in place (dev serves the seed, which is deterministic between seed refreshes — likely fine).

---

## Implementation Units

### U1. Relocation readout, structured data, and llms.txt rewrite (R5)

**Goal:** Every surface that claims Melbourne tells the true relocation story; llms.txt stops contradicting the live site.

**Requirements:** R5

**Dependencies:** None. Korab's copy sign-off required before merge (origin assumption).

**Files:**
- Modify: `src/pages/index.astro` (eyebrow, portrait caption, JSON-LD), `src/pages/about.astro` (portrait caption), `public/llms.txt` (full rewrite)
- Test: `tests/visual/seo.spec.ts` (extend JSON-LD assertions)

**Approach:**
- Hero gets the full readout (`⌖ melbourne → easton, md · us citizen · no sponsorship needed`); the two portrait captions get the short form (tight flex rows).
- JSON-LD: `address` stays factually current, add `nationality`, relocation/authorization intent in `description`.
- llms.txt rewrite: remove phantom routes (`/contact`, `/resume.json`, `/now`), align positioning with the live hero copy, state location/relocation/authorization plainly. Follow voice rules (no em dashes, Australian spelling — but keep US place-name conventions for Easton, MD).

**Patterns to follow:** existing mono eyebrow/caption markup in `src/pages/index.astro`; JSON-LD graph shape asserted in `tests/visual/seo.spec.ts`.

**Test scenarios:**
- Happy path: home page renders the full readout in the hero; both portrait captions show the short form; no surface renders bare `melbourne` as current-location-only.
- Happy path: JSON-LD Person node contains the updated `address` and `nationality` values (extend the existing per-route JSON-LD assertions to pin these fields).
- Edge case: hero readout at 375px viewport wraps acceptably (screenshot run covers this; check the diff deliberately).
- Integration: llms.txt contains no route that 404s (assert each referenced path against the route list in the e2e project).

**Verification:** `pnpm verify:all` green; grep for `melbourne`/`Melbourne` returns only intentional uses (the arrow readout, fixtures); Korab has approved the exact wording.

---

### U2. Shift toggle mechanism (R7)

**Goal:** The dormant day palette becomes reachable: pre-paint shift resolution, a console-styled toggle, persistence, and coherent browser chrome.

**Requirements:** R7

**Dependencies:** None.

**Files:**
- Create: `src/components/ShiftToggle/ShiftToggle.astro`, `src/lib/shift.ts`
- Modify: `src/layouts/BaseLayout.astro` (inline head script, theme-color handling, toggle placement in chrome)
- Test: `tests/shift.test.ts` (Vitest), `tests/e2e/shift.spec.ts` (Playwright — note: this spec only runs once U3 widens the `e2e` project's `testMatch`, which today matches only `routes.spec.ts`)

**Approach:**
- `src/lib/shift.ts` holds the pure logic (resolve shift from stored choice / session default / hour-of-day) so Vitest covers it with fixtures — the DOM side stays thin.
- `is:inline` head script in `BaseLayout.astro`, before the stylesheet, resolving in precedence order: `?shift=` query override (not persisted) → localStorage choice → sessionStorage session default → compute from local hour and cache in sessionStorage; set `data-time` and rewrite `theme-color` — all inside try/catch (any throw → night).
- `ShiftToggle.astro`: `<button aria-pressed>` labelled `shift: night` / `shift: day`, server-rendered `hidden`, revealed and wired by its own script; click flips `data-time`, persists to localStorage, updates `theme-color` and its own label/state.
- Placement: site chrome (header/footer console furniture) — present on all pages.

**Patterns to follow:** rotating-word inline script in `src/pages/index.astro` (self-guarding vanilla JS); pure-logic split per `src/lib/metric-countup.ts`; focus ring + mono label conventions from existing controls.

**Test scenarios:**
- Happy path (Vitest): stored `"day"` wins over any hour; no stored choice at 14:00 → `"day"`; no stored choice at 22:00 → `"night"`; boundary values 07:00 → day, 19:00 → night.
- Happy path (e2e): clicking the toggle flips `html[data-time]`, updates `aria-pressed` and the label, and the choice survives a reload and a cross-page navigation.
- Edge case (e2e): session default is computed once — a visitor with no stored choice does not flip theme between page views when the clock crosses the boundary mid-session (simulate via clock injection or assert sessionStorage is set after first load).
- Edge case (e2e): `?shift=day` renders day regardless of stored choice or hour, and does not overwrite the stored preference.
- Error path: storage blocked (throwing localStorage) → page renders night, no console error, toggle still flips the attribute for the current page view.
- Edge case: no-JS → toggle is not visible (`hidden`), site renders night; no dead control.
- Integration: `theme-color` meta matches the active palette after initial load and after a toggle.

**Verification:** day palette visibly applies on every page (spot-check all routes in dev); zero FOUC on hard reload in day shift; `pnpm verify` and unit tests green.

---

### U3. Day-shift test coverage and CI determinism (R7)

**Goal:** CI is deterministic under the time-based default, and both palettes are contrast-audited on every run — a day-palette regression can never fail builds only during daytime CI runs.

**Requirements:** R7 (DESIGN.md §7: both shifts audited)

**Dependencies:** U2

**Files:**
- Modify: `playwright.config.ts` (pin `data-time` for existing projects; add a day-shift axe project; **widen the `e2e` project's `testMatch`** — it currently matches only `**/routes.spec.ts`, so U2's `shift.spec.ts` and U6's disclosure spec would be silently skipped while CI stays green) — **orchestrator-owned file (not in the §5 parallel-safe list)**
- Modify: `tests/visual/accessibility.test.ts` (day-shift axe pass)
- Modify: `.lighthouserc.json` (pin collect URLs to `?shift=night`) — **orchestrator-owned by default**

**Approach:**
- Widen the `e2e` project `testMatch` to `**/e2e/*.spec.ts` (the seo/a11y projects keep their exact-file patterns). U2 and U6's new e2e specs only become runnable once this lands — verify they actually execute by checking the run report lists them.
- Pin the shift for all existing Playwright projects (init script seeding localStorage `"night"` before page load) so screenshot baselines stay canonical-night regardless of runner clock.
- Add an `a11y-day` Playwright project mirroring the axe run with localStorage seeded to `"day"`.
- Lighthouse runs a fresh profile against the static preview (verified: `.lighthouserc.json` hits bare URLs), so with clean storage the head script would resolve from the CI clock — pin the collect URLs to `http://localhost:4321/?shift=night` (and `/colophon?shift=night`) using U2's query override.

**Patterns to follow:** existing `use.contextOptions` global emulation pattern; axe project structure in `playwright.config.ts`.

**Test scenarios:**
- Happy path: full `pnpm test:visual` run at 10:00 local and at 22:00 local produces identical screenshot results (pinning works).
- Happy path: day-shift axe project runs every page the night axe project runs, and fails on a deliberately-broken day-token contrast (verify the project actually audits day by inspecting one run's applied palette).
- Error path: Lighthouse CI result is clock-independent (confirm by inspection of the pinning mechanism; note the resolution in the PR).

**Verification:** `pnpm test:visual` and `pnpm audit` green; a day-shift axe report exists in CI output.

---

### U4. Shift-log data pipeline (R9)

**Goal:** Real GitHub contribution data lands in the build with the trail-register's resilience: fetch, validate, fall back to seed, never fail the build, never hide staleness.

**Requirements:** R9, origin AE3

**Dependencies:** External, **blocking**: Korab mints a fine-grained zero-permission PAT and adds `GITHUB_CONTRIB_TOKEN` to Vercel project env + `.env.local` before this unit's verification begins — without the token, the script cannot distinguish a live fetch from the seed fallback, so the live path is untestable. Verification gate: at least one build run with a non-empty `GITHUB_CONTRIB_TOKEN` exercising the live-fetch branch. **This unit touches orchestrator-only paths throughout** (`scripts/`, `package.json`, `.env*`, seed file).

**Files:**
- Create: `scripts/gen-shift-log.ts`, `src/content/shift-log/contributions.seed.json`, `src/lib/shift-log.ts` (pure transform/stats)
- Modify: `package.json` (chain into `prebuild` only — NOT `predev`: Playwright's webServer runs `pnpm dev`, and a live fetch there would regenerate `contributions.json` from real data on every test run, drifting colophon baselines daily; dev and tests deliberately serve the committed seed via the loader's fallback), `.gitignore` (ignore generated `contributions.json`)
- Test: `tests/shift-log.test.ts`

**Approach:**
- Script POSTs the canonical `contributionsCollection.contributionCalendar` query (login, trailing year) with `Bearer $GITHUB_CONTRIB_TOKEN`. Token resolution: `process.env` first, then parse `.env.local` at the repo root when unset — `tsx` does not auto-load env files (only Astro/Vite does), so without this the local with-token path can never be exercised; Vercel's project env still wins via real `process.env`.
- Validates shape before accepting: `weeks.length ≥ 52`, each day has `date`/`contributionCount`, and `contributionLevel` is one of the five enum strings `NONE`/`FIRST_QUARTILE`/`SECOND_QUARTILE`/`THIRD_QUARTILE`/`FOURTH_QUARTILE` (the API returns enum strings, NOT 0–4 numbers — validating against numbers would reject every real response and permanently route production to the seed). Writes `src/content/shift-log/contributions.json` with a `fetchedAt` date and `source: "api"`.
- Any failure (missing token, non-200, shape mismatch): copy the seed (which carries its own `fetchedAt` and `source: "seed"`), print a loud warning, exit 0.
- `src/lib/shift-log.ts` holds pure functions: summary stats (total, busiest week, current/longest streak) computed from the API's own day buckets; amber intensity mapping from the `contributionLevel` enum strings to the 0–4 visual scale. Vitest with fixture JSON.
- Seed is generated once from a real successful fetch and committed.

**Execution note:** Make one manual API request first and validate field mappings against the real response before writing the transform (per global convention for API work).

**Patterns to follow:** `scripts/gen-trail-register.ts` end-to-end (failure→seed copy, exit 0, gitignore split) — with one deliberate deviation: this script chains into `prebuild` only, not `predev`; pure-logic split per `src/lib/metric-countup.ts`.

**Test scenarios:**
- Happy path (Vitest, fixtures): stats functions produce correct total/busiest-week/streak for a known fixture; streak logic handles a contribution today vs. yesterday vs. a gap.
- Happy path (Vitest): the enum→intensity mapping covers all five `contributionLevel` values, one fixture case each.
- Edge case: all-zero calendar → stats render zeros, no divide-by-zero, level mapping yields the empty cell for every day.
- Edge case: 53-week response (GitHub returns partial edge weeks) → accepted and handled by the grid maths.
- Error path (script, run manually with token unset): seed is copied, warning printed, exit code 0 — the build proceeds (this is origin AE3).
- Error path: malformed API response (missing `weeks`) → treated as failure → seed path.
- Integration: `pnpm build` with no token completes green using the seed.

**Verification:** local `pnpm build` succeeds both with and without the token; generated JSON matches the schema the component consumes; warning clearly distinguishes seed from live in build output.

---

### U5. Shift-log grid on the colophon (R9)

**Goal:** The contribution grid renders in console grammar beside the build log, honest about its data age and invisible to screen-reader noise.

**Requirements:** R9

**Dependencies:** U4

**Files:**
- Create: `src/components/ShiftLog/ShiftLog.astro`
- Modify: `src/pages/colophon.astro`
- Test: `tests/shift-log.test.ts` (stats already covered in U4; add level-mapping cases), existing `a11y` + `e2e` projects pick up the page

**Approach:**
- 52×7 SVG or CSS-grid of cells, amber intensity scale from `contributionLevel` (amber is the signal colour; moss stays semantic-only per house rules).
- Mono summary line above/below (`1,085 contributions · busiest week N · streak N days`) — this is the accessible representation; the cell grid is `aria-hidden="true"`.
- Mono caption: `data as of YYYY-MM-DD` from `fetchedAt` (the staleness signal — required because Vercel precedent shows the seed can silently become production's permanent source).
- Colophon loader mirrors `loadCommits()`: generated JSON, then seed, tolerant of parse failures; section conditionally renders only when data exists.
- Mobile (375px): grid breaks out of the 620px prose measure — horizontal scroll container or truncated recent-weeks view (deferred choice, decide against the real render).
- Colophon is Lighthouse-gated: keep the grid lean (a few KB of markup; no client JS needed at all).

**Patterns to follow:** conditional "Build log" section in `src/pages/colophon.astro`; content-gated rendering convention (no placeholder data — the seed is real data).

**Test scenarios:**
- Happy path: colophon renders the grid section with summary stats matching the JSON fixture the dev server serves (seed).
- Happy path (a11y): axe passes; the grid subtree is absent from the accessibility tree; the summary line is exposed.
- Edge case: missing/unparseable both JSON files → section does not render, page still builds (mirrors the commits loader).
- Edge case: 375px viewport → no horizontal page overflow (grid scrolls inside its own container or truncates).
- Integration: Lighthouse `/colophon` stays ≥ 0.9 perf with the grid present.

**Verification:** `pnpm verify:all` green including Lighthouse on `/colophon`; visual diff on colophon reviewed once and baselines re-seeded; grid matches Korab's public GitHub profile numbers.

---

### U6. Metric provenance footnotes (R2)

**Goal:** Every case-study metric can answer "according to whom, measured how, over what period" at the moment of doubt — enforced by the build, not by review discipline.

**Requirements:** R2, origin AE4

**Dependencies:** None. Content: provenance text AI-drafted from real project records, Korab-approved before merge (collaboration model: AI drafts, Korab refines). `keystatic.config.ts` is **orchestrator-only**.

**Files:**
- Modify: `keystatic.config.ts` (add required `provenance` field to `outcomeMetrics` items), `src/lib/projects.ts` (carry the field; throw at build when missing), `src/components/CaseStudy/OutcomeMetrics.astro` (disclosure UI)
- Modify: `src/content/projects/ai-sms-pilot/`, `src/content/projects/lead-scoring/` (author provenance for every existing metric)
- Test: `tests/projects.test.ts` (or extend existing lib tests), `tests/e2e/` (disclosure interaction — note: a new spec file only runs once U3 widens the `e2e` project's `testMatch`)

**Approach:**
- Schema: `provenance: fields.text({ multiline, isRequired })` per metric — Keystatic enforces it for future entries; the `src/lib/projects.ts` mapper throws for legacy entries so AE4 is a build failure. Migrate both existing entries in the same commit.
- UI: native `<details>` per metric — small mono `<summary>` marker after the value (existing focus ring), inline footnote row as its content. Click/tap/Enter is the canonical interaction; hover preview is an optional JS enhancement. Works with JS disabled by construction. No island, no tooltip library.
- Footnote content style: one or two mono sentences — method, period, what counted. Real records only; no metric gets invented provenance (anti-slop rule).

**Patterns to follow:** `src/components/CaseStudy/OutcomeMetrics.astro` existing structure and scoped styles; count-up script's progressive-enhancement discipline; pure-logic split if any parsing emerges.

**Test scenarios:**
- Happy path (e2e): activating a marker opens the disclosure (`<details open>`) and reveals the footnote; activating again closes it; keyboard (Tab + Enter) drives the same flow.
- Edge case (e2e): with JavaScript disabled, the disclosure still opens and closes (native `<details>` behaviour).
- Happy path (Vitest): `src/lib/projects.ts` maps `provenance` through for every metric in a fixture.
- Error path (Vitest): a fixture metric without `provenance` → the mapper throws with a message naming the project and metric (AE4 enforcement).
- Edge case: long provenance text wraps within the metric row at 375px without breaking the bordered-row layout.
- Integration (a11y): axe passes on a case-study page with footnotes present; disclosure pattern announces correctly.
- Integration: count-up behaviour is unaffected by the added marker/footnote markup (values still animate and settle).

**Verification:** `pnpm verify:all` green; both live case studies show Korab-approved provenance on every metric; a metric without provenance fails `pnpm build` locally.

---

## System-Wide Impact

- **Interaction graph:** R7's `data-time` attribute affects every token-consuming surface site-wide at once — including the new R9 grid (amber scale must pass contrast in both shifts) and R2 footnotes. U3's day-shift axe pass is the safety net.
- **Error propagation:** R9's fetch failure is absorbed at the prebuild boundary (seed + warning); the colophon loader absorbs file-level failure (section vanishes). No failure path reaches the visitor. R2 inverts this deliberately: missing provenance fails the build loudly.
- **State lifecycle risks:** R7 introduces the repo's first web-storage usage; all reads/writes try/catch-wrapped with night as the universal fallback. Session-cached default prevents mid-session theme flips.
- **API surface parity:** JSON-LD, llms.txt, and visible hero copy must tell the same relocation story (U1 changes all three together). The OG image deliberately stays night — recorded, not an oversight.
- **Integration coverage:** cross-page toggle persistence (e2e), build-with/without-token (U4), Lighthouse on both gated pages after U2/U5 land.
- **Unchanged invariants:** portrait asset and its four consumers untouched (R1 cut); motion budget unchanged at five; night remains the canonical screenshot palette; amber remains the only signal colour; zero framework client JS still holds — every new script is inline vanilla.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `GITHUB_CONTRIB_TOKEN` never added to Vercel → production serves seed forever, silently | `data as of` caption makes staleness visitor-visible; loud build warning; token setup is an explicit external dependency of U4 |
| Day palette has a latent contrast failure that only surfaces when a visitor lands during daytime | U3's day-shift axe project audits day on every CI run from day one |
| Time-based default makes CI results depend on runner clock | U3 pins `data-time` for screenshots/Lighthouse; day covered by dedicated axe project |
| R5 wording published before Korab confirms facts (anti-slop violation) | Copy sign-off is a merge gate on U1, recorded from the origin assumption |
| Keystatic schema change breaks the build for existing entries missing `provenance` | Migration of both entries lands in the same commit as the schema change (U6) |
| Colophon screenshot baselines churn with grid data | Dev/test serve the deterministic seed; pixelmatch mask deferred until observed flake |
| Several units touch orchestrator-only paths (`package.json`, `keystatic.config.ts`, `scripts/`, `.env*`, `playwright.config.ts`) | Those edits stay with the orchestrator; subagents get component/content/test work only |

---

## Documentation / Operational Notes

- DESIGN.md (parent repo `Personal_Brand/DESIGN.md`): record the shift-toggle behaviour (default rule, persistence, `prefers-color-scheme` deliberately ignored) and close the "build the toggle or delete the dead tokens" open decision from the console-MVP launch review. No motion-budget change.
- Ship checklist additions: mint the fine-grained PAT (1-year expiry — calendar a renewal); refresh `contributions.seed.json` opportunistically when a local fetch succeeds.
- `tokens.css` header says token changes flow through DESIGN.md first — U2 activates existing tokens without changing them, so no token edit is expected; if day-shift contrast fixes emerge from U3, they route through DESIGN.md.
- After shipping: capture learnings (first build-time network call, storage patterns, day-shift audit setup) — this repo has no `docs/solutions/`; learnings live in memory + `docs/reviews/`.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-07-06-ux-enhancement-ideas-requirements.md](../brainstorms/2026-07-06-ux-enhancement-ideas-requirements.md)
- Related code: `scripts/gen-trail-register.ts`, `src/styles/tokens.css`, `src/components/CaseStudy/OutcomeMetrics.astro`, `src/pages/colophon.astro`, `playwright.config.ts`
- Prior plans: `docs/plans/2026-07-03-console-mvp.md` (tokens-swap decision), `docs/plans/2026-07-04-001-feat-experience-ledger-tailored-pages-plan.md` (motion budget, inline-script patterns)
- Launch review: `docs/reviews/2026-07-04-console-mvp-launch.md` (toggle-or-delete-tokens open decision)
- External: GitHub GraphQL `contributionsCollection` docs; GitHub fine-grained PAT GraphQL support changelog (2023-04-27); Tailwind 4 theming docs (researched, not needed); Astro `is:inline` / client-scripts docs
- R1 research preserved for future revisit: linedraw/hatched-style photo-to-line-art pipelines, `pathLength="1"` dash animation, LCP occlusion-not-opacity mechanism (see origin R1 and the planning session research)
