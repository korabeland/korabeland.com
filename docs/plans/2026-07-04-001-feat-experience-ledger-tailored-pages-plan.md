---
title: "feat: Experience ledger, skills section, hero animation, and tailored landing pages"
type: feat
status: active
date: 2026-07-04
origin: docs/brainstorms/2026-07-04-experience-ledger-and-tailored-pages-requirements.md
---

# feat: Experience ledger, skills section, hero animation, and tailored landing pages

## Summary

Add the professional layer to the Operator's Console: an experience collection and skills singleton in Keystatic feeding a new homepage experience section and an about-page skills section, a rotating hero headline and metric count-ups built server-static-first with JS as enhancement, a consolidated status-chip treatment, and prerendered, unlisted `/for/[slug]` tailored pages whose configs store explicit ordered references into the content pool and fail the build loudly on dangling references.

---

## Problem Frame

The console MVP (merged 2026-07-04) presents projects and identity but carries no employment history, skills section, or way to address a specific role — the application-facing gap the origin document defines. This plan turns those requirements into implementation against the existing Astro 6 + Keystatic + Vercel stack. Full product context: see origin.

---

## Requirements

R-IDs trace to the origin document (R1–R15). All fifteen are in scope; none narrowed.

- R1–R4: Experience ledger (reverse-chronological roles, quantified bullets, conditional testimonials, lives in homepage/about flow) — U1, U2
- R5: Skills/certifications section — U1, U3
- R6–R7: Rotating hero headline, static under reduced motion — U4
- R8–R9: Metric readouts with guarded count-up; status badges from fixed vocabulary — U5
- R10–R11: Structured, tagged content pool as single source of truth — U1
- R12–R15: Tailored pages (config-driven, unlisted/noindex, slim anatomy, deletable) — U6

**Origin actors:** A1 (Korab — owns content and claims), A2 (agent — generates tailored configs), A3 (hiring manager — arrives via sent link)
**Origin flows:** F1 (tailored page creation), F2 (visitor journey), F3 (cleanup)
**Origin acceptance examples:** AE1 (covers R3), AE2 (covers R7), AE3 (covers R8), AE4 (covers R12), AE5 (covers R13)

---

## Scope Boundaries

- korabeland.github.io playground, chatbot, press logos, scroll reveals, subdomains, automated tailored-page lifecycle, repo cards, changes to existing case-study content — all excluded per origin.
- Day/night theme toggle: the dead `[data-time="day"]` tokens remain untouched; new components style against the default (night) tokens only. The open toggle decision stays open.
- `404.astro` lacking `noindex` is pre-existing and out of scope (flagged during research as a possible drive-by, not planned here).

### Deferred to Follow-Up Work

- Update parent-repo `STRATEGY.md` to record the site division (korabeland.com application-facing, github.io playground): separate commit in the `Personal_Brand` parent repo — it is a different git repository.
- Capture post-landing learnings (tag taxonomy shape, tailored-config pattern) in `docs/solutions/`: after first real tailored page ships.

---

## Context & Research

### Relevant Code and Patterns

- `keystatic.config.ts` — `projects` collection is the schema model: trailing-slash path (`src/content/projects/*/`, locked decision), `fields.array(fields.object({...}))` for `outcomeMetrics` ({value, label}) and `fieldLog`, `itemLabel` callbacks, images via `directory: "public/work"` + `publicPath`.
- `src/lib/projects.ts` / `src/lib/posts.ts` — reader-module convention: `createReader`, hand-mapped summary interface with null coalescing, reverse-chron `localeCompare` sort, `read<X>(slug)` throwing on missing. `src/content.config.ts` intentionally exports empty collections — do not use `astro:content`.
- `src/pages/work/[slug].astro` — `export const prerender = true` + `getStaticPaths` from the reader; JSON-LD via named slot into `src/layouts/BaseLayout.astro`.
- `src/layouts/BaseLayout.astro` — `noindex` prop already renders `<meta name="robots" content="noindex">` (precedent: `src/pages/off-trail.astro`); hardcoded `NAV_LINKS` means new pages are unlisted by default; `active` prop omitted → no nav highlight.
- `src/pages/index.astro` — section template: `<section aria-labelledby>` + `.section-head` (`h2.t-label` + `.t-mono` more-link); ledger stagger animation via `--row` custom property; `.ledger-chip--active/--shipped` chips (amber = in flight, moss = shipped); `.hero-avail-dot` breathing dot.
- `src/styles/global.css` — `.t-mono`/`.t-label` already set `font-variant-numeric: tabular-nums`; global reduced-motion kill-switch (~line 211) forces all CSS animation to 0.001ms; contrast rules (`--ink-mute` never below ~14px, `--amber` decorative only).
- `src/components/CaseStudy/OutcomeMetrics.astro` — existing metric-readout component to extend.
- `tests/e2e/routes.spec.ts`, `tests/visual/seo.spec.ts`, `tests/visual/screenshot.test.ts` — hardcoded ROUTES arrays and per-route seo table; missing visual baseline auto-writes (regenerate locally on macOS, commit); CI deletes baselines and relies on Chromatic for cross-env diffs.
- `docs/launch-readiness.md` rows 7–9 — the proven hide-a-route recipe (`/off-trail`, `/dev/` precedents).

### Institutional Learnings

- `docs/reviews/2026-07-04-console-mvp-launch.md` — Keystatic image fields must point at `public/` (fix #10); canonical/sitemap consistency depends on `trailingSlash: "never"` (fixes #6–7); don't build config systems without consumers (fix #5, the deleted `siteMeta`); CI Playwright validates dev SSR, not the prod build (fix #8).
- `docs/plans/2026-07-03-console-mvp.md` — motion budget locked at "exactly 3 moments" (this plan amends it, see Key Technical Decisions); JetBrains Mono + `tabular-nums` is the locked numeric treatment; moss reserved for "shipped"; disclosure grep gate (`rg -i "enrola|student ignite|scu|..."`) applies to all new content — ranges-only numbers, no vendor/partner names.
- Memory `feedback_astro_underscore_routing.md` — never use `src/pages/_for/` for unlisting; Astro drops underscore page dirs from routing entirely.
- Flow analysis (this session) — tag-based build-time selection is fragile (tag rename silently empties a page); reader-pattern null-skipping would silently gut a tailored page; JS animation bypasses the CSS reduced-motion kill-switch.

### External References

- None — all surfaces have direct local patterns; external research skipped.

---

## Key Technical Decisions

- **Tailored configs store explicit ordered `fields.relationship` references, not tag queries**: tags exist for the agent's discovery (R11); the build resolves only stored refs, so tag renames can't silently change a sent page, and ordering is first-class (R12).
- **Dangling references fail the build loudly**: the tailored-page lib throws on any unresolvable ref instead of null-skipping like `listProjects`. A broken deploy beats a hollow page in a recruiter's inbox.
- **`/for/[slug]` is prerendered** (`getStaticPaths` over the tailored collection): matches every other page, and creating/deleting a page is a commit + deploy — consistent with the git-based Keystatic flow. Requires extending the sitemap `filter` in `astro.config.mjs` (orchestrator-only file) because prerendered routes are auto-enumerated.
- **`noindex` without `robots.txt` disallow for `/for/`**: a robots disallow would prevent crawlers from ever seeing the noindex directive. Sitemap exclusion + noindex meta is the correct pair (differs deliberately from the `/dev/` recipe).
- **Server-rendered static default; JS only enhances**: hero headline SSRs the default subject, metrics SSR their final values. Scripts check `matchMedia("(prefers-reduced-motion: reduce)")` before animating — the CSS kill-switch does not stop scripted mutation. No-JS and reduced-motion visitors get AE2/AE3 behaviour for free.
- **Motion budget amended from 3 to 5 moments** — this is a user-approved amendment to the console-mvp plan's locked "exactly 3 motion moments. Nothing else." constraint, decided in this plan's brainstorm/planning dialogue, not a proposal awaiting sign-off. The two additions are the hero-headline rotation (U4) and the metric count-up (U5); both are static under reduced motion and JS-optional. This plan's 5-moment budget supersedes the console-mvp constraint; implementers should treat the console plan's "exactly 3" line as amended, not blocking.
- **Status vocabulary: derived where derivable, explicit where not**: case studies keep deriving status from `shippedAt`; experience roles carry an explicit current/prior state from their date range. One `StatusChip` component renders the shared fixed vocabulary (R9), replacing the three inline dot/chip copies.
- **Inline `<script>` in `.astro` components, no React islands**: the site currently ships zero client JS; a count-up and headline rotator don't justify hydration machinery or new dependencies.
- **Placement (user-confirmed)**: experience ledger as a new homepage section with `experience-*` class/id names (avoiding the existing `ledger-*` selectors asserted in e2e tests); skills/certifications on the about page.

---

## Open Questions

### Resolved During Planning

- Section placement (origin deferred): homepage for experience, about for skills — confirmed in synthesis.
- Noindex/sitemap mechanics (origin deferred): BaseLayout `noindex` prop + sitemap filter extension; verified against `trailingSlash: "never"` setup.
- Deletion semantics: a deleted tailored page 404s to the existing off-trail page, which has a path home — acceptable landing for a stale link. Delete on application conclusion (offer/rejection), not on send.

### Deferred to Implementation

- Tag taxonomy values: seeded during first real content entry with Korab; the schema only needs a free-text tag array now.
- Hero rotation phrase list and timing: content decision at implementation, with Korab; default phrase must keep the `h1` assertion in `tests/e2e/routes.spec.ts` valid (currently expects "ship") or that assertion updates with it.
- Exact count-up numeric pattern edge set: settled when writing the parser tests.

---

## Implementation Units

### U1. Content model: experience collection, skills singleton, readers

**Goal:** The tagged content pool (R10–R11) exists in Keystatic with typed reader modules, ready for both base-site sections and tailored pages.

**Requirements:** R1 (data), R2 (data), R3 (data), R5 (data), R10, R11

**Dependencies:** None

**Files:**
- Modify: `keystatic.config.ts` (orchestrator-only — single-session edit)
- Create: `src/lib/experience.ts`, `src/lib/skills.ts`
- Test: `tests/experience.test.ts`, `tests/skills.test.ts` (schema/reader tests use test-only fixtures — no committed collection entries; see approach note below)

**Approach:**
- `experience` collection (path with trailing slash, mirroring `projects`): company, role title, location, start/end dates (open end = current), achievement bullets as an array requiring at least one entry, each bullet optionally carrying a highlight metric {value, label}; free-text tag array; optional testimonial {quote, attribution, source URL}.
- `skills` singleton: categorised skill groups plus certifications {name, issuer, year, optional URL}. Reader returns null when absent → callers skip the section (content gates launch, not build).
- Readers follow `src/lib/projects.ts`: hand-mapped interfaces, null coalescing, reverse-chron sort by start date.
- **No committed fixture content on the live pages.** Committed Keystatic entries render in every environment (prod deploys from `main`), so there is no "dev-only fixture" mechanism — do not commit placeholder roles to make sections appear in dev. The experience collection ships empty; U2's section renders only when real entries exist (same conditional-render pattern as the skills singleton). Real content gates launch, not the build. Any schema-validation testing uses test-only fixtures consumed directly by the Vitest files, never committed collection entries.

**Patterns to follow:** `keystatic.config.ts` projects collection (`outcomeMetrics`, `itemLabel`); `src/lib/projects.ts`.

**Test scenarios:**
- Happy path: `listExperience()` returns roles sorted reverse-chronologically by start date; current role (no end date) sorts first.
- Edge case: role with no testimonial → summary object has empty/absent testimonial, not a placeholder value.
- Edge case: skills singleton file absent → reader returns null without throwing.
- Edge case: optional fields (location, metric on a bullet) absent → coalesced, never `undefined` leaking to templates.

**Verification:** `pnpm verify` and `pnpm test` pass; Keystatic admin UI (dev) shows both collections and can round-trip an entry.

---

### U2. Experience ledger section on the homepage

**Goal:** Work history renders as a console-native homepage section with quantified bullets, conditional testimonials, and a status chip on the current role (R1–R4).

**Requirements:** R1, R2, R3, R4. Covers AE1.

**Dependencies:** U1 (readers), U5 (StatusChip — or land with a placeholder chip and swap)

**Files:**
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/routes.spec.ts`, `tests/visual/screenshot.test.ts` baselines (regenerate `home_*` locally, commit)

**Approach:**
- New `<section class="experience-section" aria-labelledby="experience-heading">` following the existing section-head template, placed after the outcome ledger. All new ids/classes use the `experience-` prefix — the `ledger-*` namespace is taken and asserted in e2e tests.
- **Section renders only when `listExperience()` returns entries** (mirrors the skills-singleton-absent behaviour in U1/U3). With the collection empty at launch, the homepage is unchanged; the section appears the moment real roles land. This keeps placeholder content off the live homepage and avoids a CI failure from an unconditional row assertion (see below).
- Row layout per role: company, title, period (t-mono), achievement bullets; testimonial renders as a quoted aside only when present — no empty container (AE1).
- Content constraint carried from the console plan: ranges-only numbers, no vendor/partner names; run the disclosure grep gate over new content before commit.

**Patterns to follow:** `.ledger-section` markup and stagger-reveal pattern in `src/pages/index.astro`.

**Test scenarios:**
- Happy path: when the experience collection has entries, the homepage renders `#experience-heading` and one `.experience-row` per role. Because the collection is empty at launch, gate this assertion on section presence (skip or conditionally assert when absent) rather than asserting "at least one row" unconditionally — an unconditional assertion fails CI until real content lands. Component-level render logic is covered directly in a unit test with a test-only fixture list.
- Covers AE1. Edge case: a role with no testimonial renders no testimonial element (assert selector absence) — unit test against a test-only fixture.
- Integration: existing `#ledger-heading` / `.ledger-row` assertions still pass — the new section must not break the outcome ledger's selectors.
- Accessibility: axe suite passes with the new section (existing `tests/visual/accessibility.test.ts` covers the route).

**Verification:** `pnpm verify:all` green; regenerated homepage baselines committed; disclosure grep gate returns no hits on new content.

---

### U3. Skills and certifications section on the about page

**Goal:** A scannable, categorised skills/education/certifications section on the about page (R5).

**Requirements:** R5

**Dependencies:** U1

**Files:**
- Modify: `src/pages/about.astro`
- Test: `tests/e2e/routes.spec.ts`, `about_*` visual baselines

**Approach:**
- New section after `.about-operate`, using the `t-label` heading + `--rule` separator conventions; categories as compact term lists, certifications with issuer/year in `t-mono`.
- Section renders only when the skills reader returns data (no empty scaffolding at launch).

**Patterns to follow:** `.about-operate` section structure in `src/pages/about.astro`.

**Test scenarios:**
- Happy path: about page renders the skills section heading and at least one category when singleton content exists.
- Edge case: singleton absent → section entirely absent (assert selector absence in a unit-level template test or e2e against fixture state).

**Verification:** `pnpm verify:all` green; regenerated about baselines committed.

---

### U4. Rotating hero headline

**Goal:** Hero headline rotates its main subject with fixed supporting copy; static default under reduced motion and without JS (R6–R7).

**Requirements:** R6, R7. Covers AE2.

**Dependencies:** None (independent of content pool)

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `playwright.config.ts` (add `reducedMotion: 'reduce'` emulation for deterministic tests)
- Test: `tests/e2e/routes.spec.ts`

**Approach:**
- The `h1` server-renders the default subject; an inline `<script>` swaps subjects on an interval with a short CSS fade. The script exits early when `matchMedia("(prefers-reduced-motion: reduce)")` matches or fewer than two phrases exist.
- Swap mechanics must keep the accessible name stable (no `aria-live` announcements; rotating text `aria-hidden` with the default subject as the accessible text, or equivalent) — implementation detail settled with axe in the loop.
- Phrase list authored with Korab at implementation; the default phrase preserves (or consciously updates) the existing `h1` content assertion.

**Execution note:** Add the Playwright `reducedMotion` emulation first — it locks the static-default path as the tested path before any animation lands.

**Patterns to follow:** existing keyframes in `src/styles/global.css`; motion principles in `DESIGN.md` lines 277–310 (timings ≥ 200ms, reduced motion keeps static end-states).

**Test scenarios:**
- Covers AE2. Happy path (under test emulation): with reduced motion, the `h1` shows the default subject and does not change over a multi-second wait.
- Edge case: phrase list of one → script never starts (behaviour identical to reduced motion).
- Integration: `h1#hero-heading` content assertion in `routes.spec.ts` still passes deterministically.

**Verification:** `pnpm verify:all` green with reduced-motion emulation active; manual check in a normal browser shows rotation; motion budget amendment noted in the commit.

---

### U5. Status chips and metric readouts with guarded count-up

**Goal:** One `StatusChip` component rendering the fixed status vocabulary across ledger entries and case studies; metric readouts in tabular-nums monospace with a count-up that only animates clean numerics (R8–R9).

**Requirements:** R8, R9. Covers AE3.

**Dependencies:** None hard; U2 consumes the chip

**Files:**
- Create: `src/components/StatusChip/StatusChip.astro`
- Modify: `src/pages/index.astro`, `src/pages/about.astro` (replace inline dot/chip copies), `src/components/CaseStudy/OutcomeMetrics.astro` (count-up enhancement)
- Test: `tests/metric-countup.test.ts` (numeric-pattern parser), `tests/e2e/routes.spec.ts`

**Approach:**
- `StatusChip` consolidates the three existing inline implementations (`.hero-avail-dot`, `.about-status-dot`, `.ledger-chip--*`): props for status value; amber = active/in-flight, moss = shipped (locked semantic colours); dot stays `aria-hidden` with meaning in adjacent text.
- Status mapping: case studies derive from `shippedAt` as today; experience roles derive current/prior from date range. The fixed display vocabulary (R9: "in production", "shipped", "ongoing") maps onto these derivations — no second source of truth.
- Count-up: inline `<script>` with `IntersectionObserver`; animates only values matching a strict leading-number pattern (optional suffix like `%`/`x`); range strings ("30–50%") and words render static. Server-rendered markup always contains the final value; the script only re-animates from zero when allowed (AE3 holds for reduced-motion, no-JS, and non-numeric cases).

**Patterns to follow:** component-subfolder convention (`src/components/CaseStudy/`); `.astro` components are imported by path, not the barrel (barrel only picks up `.tsx`/`.ts`).

**Test scenarios:**
- Happy path: parser accepts "42", "90%", "3x" (animatable) — Vitest unit tests on the extracted pattern.
- Covers AE3. Edge case: "30–50%", "hundreds", "" → classified static; e2e under reduced-motion emulation asserts final value present immediately.
- Integration: replacing the about-page dot with `StatusChip` leaves the axe suite and `about_*` visuals stable (baseline regen expected once).

**Verification:** `pnpm verify:all` green; grep confirms the three inline dot/chip implementations are gone.

---

### U6. Tailored landing pages at /for/[slug]

**Goal:** Config-driven, prerendered, unlisted tailored pages with fail-loud reference resolution (R12–R15).

**Requirements:** R12, R13, R14, R15. Covers AE4, AE5.

**Dependencies:** U1 (pool), U5 (chips/metrics used in rendering)

**Files:**
- Modify: `keystatic.config.ts` (tailored collection), `astro.config.mjs` (sitemap filter += exclude `/for/`) — both orchestrator-only, single-session edits
- Create: `src/lib/tailored.ts`, `src/pages/for/[slug].astro`
- Create: `src/content/for/demo/` fixture entry (permanent CI anchor; harmless content). Because the fail-loud resolver throws on any dangling reference, `demo`'s ordered refs point only at content that always exists — the real `src/content/projects/*` entries (`ai-sms-pilot`, `lead-scoring`). It gains experience refs only once real experience entries land; until then it references projects and skills alone, so the empty experience collection never breaks the build.
- Test: `tests/tailored.test.ts`, `tests/visual/seo.spec.ts`, `tests/e2e/routes.spec.ts`

**Approach:**
- `tailored` collection: display company/role name, bespoke intro (the only free-form copy, R12), ordered `fields.relationship` arrays referencing experience entries and projects, optional selected skill categories.
- `src/lib/tailored.ts` resolves refs and **throws** on any dangling reference or empty selection — build fails rather than shipping a gutted page.
- `src/pages/for/[slug].astro`: `prerender = true` + `getStaticPaths` over the collection; BaseLayout with `noindex`, no `active` nav prop; anatomy per R14 — wordmark home, intro, selected experience/skills, case-study exit links, contact CTA. Unknown slugs fall through to the SSR 404 (off-trail page with a path home) — this is also the stale-link answer (F3).
- Sitemap filter extension is the only `astro.config.mjs` change; **no** robots.txt disallow (noindex must stay crawlable).
- The agent-side generation workflow (F1) is operational, not code: documented in this plan's Documentation notes.

**Test scenarios:**
- Covers AE4. Happy path: `/for/demo` renders intro plus only pool-sourced content; every rendered item traces to a stored ref (assert against fixture).
- Covers AE5. Integration: seo.spec row for `/for/demo` asserts `noindex: true`; new assertion fetches the sitemap and confirms no `/for/` URL appears; no nav link to `/for/` anywhere.
- Error path: lib test — config referencing a nonexistent experience slug throws with a message naming the bad ref.
- Error path: e2e — `/for/nonexistent-xyz` returns HTTP 404 rendering the off-trail page.
- Edge case: config with empty reference arrays fails validation/build.

**Verification:** `pnpm verify:all` green; `pnpm build` succeeds with the demo fixture and fails (verified once locally) with a deliberately broken ref; built sitemap contains no `/for/` entries.

---

## System-Wide Impact

- **Interaction graph:** homepage and about page are the blast radius (new sections, chip replacement); `BaseLayout` untouched except consumers passing existing props; `NAV_LINKS` unchanged (unlisted-by-default holds).
- **Error propagation:** tailored-ref resolution throws at build time — failures surface in CI/Vercel build logs, never at request time; all other readers keep their existing null-coalescing behaviour.
- **State lifecycle risks:** tailored pages exist exactly as long as their config entry exists in git; stale sent links land on the 404/off-trail page. No caches, no cleanup jobs.
- **API surface parity:** none — no exported APIs; the sitemap filter is the only externally-visible contract change (shrinks surface, never grows it).
- **Integration coverage:** sitemap-absence and noindex assertions for `/for/`; existing-selector stability for the outcome ledger; axe across changed routes.
- **Unchanged invariants:** URL policy (`trailingSlash: "never"`, slash-free canonicals), existing routes and their seo.spec rows, the Keystatic dev-only admin gating, zero-hydration architecture (inline scripts only, no islands).

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Content dependency: real roles, metrics, certs must come from Korab | Schema, readers, and section components land regardless and are covered by unit tests using test-only fixtures. New sections conditionally render (empty collection → section absent, homepage unchanged), so shipping the code without content neither breaks CI nor puts placeholder content live. Launch of real content is a content task, not a code blocker |
| Disclosure gate: quantified work history is the riskiest content class on the site | Ranges-only numbers, no vendor/partner names; run the console plan's rg gate before every content commit |
| Visual-baseline churn (homepage + about change in 3 units) | Regenerate locally once per unit, commit; Chromatic owns cross-env diffs; reduced-motion emulation keeps screenshots deterministic |
| CI validates dev SSR, not prod build (known gap, console review fix #8) | U6 verification includes one manual local `pnpm build`; the deferred prod smoke test remains open and is not expanded here |
| Orchestrator-only files (`keystatic.config.ts`, `astro.config.mjs`) touched by U1/U6 | This is a single-session solo build — edits stay in the main session, no parallel subagent writes |

---

## Documentation / Operational Notes

- **Tailored-page generation runbook (F1, operational):** when applying, tell the agent the company/role; it drafts a `src/content/for/<company>/` entry (intro + ordered refs chosen via tags), Korab reviews, commit + push deploys the page; the sent link is `korabeland.com/for/<company>`. Delete the entry on application conclusion. Record this in the repo README or a short `docs/` note as part of U6.
- Motion budget amendment (3 → 5 moments) should be reflected when `DESIGN.md` is eventually rewritten for the console system (it is stale, park-map-era; flagged during research — not fixed in this plan).

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-07-04-experience-ledger-and-tailored-pages-requirements.md](docs/brainstorms/2026-07-04-experience-ledger-and-tailored-pages-requirements.md)
- Related docs: `docs/plans/2026-07-03-console-mvp.md`, `docs/reviews/2026-07-04-console-mvp-launch.md`, `docs/launch-readiness.md`
- Related code: `keystatic.config.ts`, `src/lib/projects.ts`, `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/components/CaseStudy/OutcomeMetrics.astro`
- Inspiration reference: santifer.io/en (reviewed in brainstorm; receipts-first adoption rule applies)
