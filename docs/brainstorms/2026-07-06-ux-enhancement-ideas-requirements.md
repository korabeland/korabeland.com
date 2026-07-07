---
date: 2026-07-06
topic: ux-enhancement-ideas
---

# UX Enhancement Ideas — 10 Candidates for korabeland.com

## Summary

Ten UX/design enhancements for korabeland.com, a deliberate mix of functional utility for visiting hiring managers and creative, memorable pieces. Each idea is anchored to real data or real content so nothing reads as AI slop. Intent is to ship a curated subset (3–4), not all ten.

---

## Problem Frame

korabeland.com is the application-facing front door for an active job search (target roles: AI strategy/ops, CX leadership, product; primary audience: hiring managers and recruiters). The Operator's Console MVP shipped with hero, outcome ledger, case studies, notes, and tailored `/for/` pages. The site is functional but has few signature moments: nothing a hiring manager who has reviewed 40 candidates would remember an hour later, and a few real utility gaps (e.g., the site still reads "Melbourne" while the search targets DC/Baltimore and US-remote). The risk in adding features is the opposite failure: decorative, template-flavoured additions that read as AI-generated filler.

---

## Requirements

Each idea is one candidate enhancement. Effort tags: small / medium / large.

**Functional — utility for the visiting hiring manager**

- R1. **The plotted portrait** (medium-large). Hero portrait rendered as vector line art (contours + crosshatching, generated from the existing photo at build time, hand-tuned) that draws itself pen-plotter style over ~2s on first visit — contours, then hatching, then a single amber accent stroke — and **must resolve into the current portrait image as its final state** (line art crossfades into the existing raster; end state is pixel-identical to today's portrait). Runs once per session; repeat visits and reduced-motion get the final image instantly. Two optional layers: hatching tone shifts with the day/night shift (pairs with R7), and hatching seeded by the latest commit sha with a mono caption (`rendered from <sha>`).
- R2. **Metric provenance** (small). Every number in a case-study outcome metrics block gets a hover/tap footnote: how it was measured, over what period, what counted. Makes the "every number real" design principle verifiable.
- R3. **The 90-second brief** (medium). Toggle on each case study that collapses it to fact strip + metrics + one key decision + outcome, labelled honestly ("the 90-second version"). Full prose remains one click away.
- R4. **Requirement-to-evidence map on `/for/` pages** (medium). Each line of a job's requirements maps to a specific case-study section or metric with a deep link, turning tailored pages into a decision aid that does the hiring manager's screening for them.
- R5. **Relocation readout** (small). One mono status line correcting a real gap: hero and JSON-LD currently say Melbourne, but the search targets Easton MD / DC / Baltimore / US-remote. Shape: `⌖ melbourne → easton, md · us citizen · no sponsorship needed`. Highest value-to-effort on the list.
- R6. **Single-source resume** (medium). A `/resume` route generated from the same content collections that power the site, plus a print stylesheet exporting a clean one-page brief. Site and resume cannot drift because they are one source of truth.

**Creative — memorable, in console grammar**

- R7. **Shift change day/night toggle** (small-medium). The day-shift palette is already fully specced in DESIGN.md; stage the toggle as a console control (`shift: night`), defaulting to the visitor's local time. Both palettes are hand-tuned, not auto-inverted.
- R8. **"Built with AI, decided by me" colophon** (medium). Extend the colophon's git build log with real repo stats (commits, PRs, sessions) and an honest split of what the AI produced vs. what Korab decided and rejected. Transparency is the credibility move for the "builds with AI" positioning.
- R9. **Shift log — contribution grid** (small). GitHub contribution grid rebuilt in console grammar: amber-scaled cells, mono summary stats (`1,085 contributions · busiest week · streak`), real contribution data fetched from the GitHub API at build time with a committed seed fallback (same pattern as the trail-register). Placement: colophon beside the build log, or a home-page band.
- R10. **Decision forks in the Field Log** (small-medium). Case-study FieldLog gains fork entries: the option not taken and what it would have cost. Shows the judgment hiring managers at the target level are actually buying.

---

## Acceptance Examples

- AE1. **Covers R1.** Given a first visit with motion allowed, when the hero loads, the portrait draws in as line art and finishes as the existing portrait image (identical to the current static state); on the same session's next page view, the final image renders immediately with no animation.
- AE2. **Covers R1.** Given `prefers-reduced-motion`, when the hero loads, the current static portrait renders with no draw-in (this is the Playwright-tested path).
- AE3. **Covers R9.** Given the GitHub API is unreachable at build time, when the site builds, the shift log renders from the committed seed data and the build does not fail.
- AE4. **Covers R2.** Given a metrics block, when a visitor hovers/taps a number, a footnote states measurement method and period; no metric ships without provenance content.

---

## Success Criteria

- A hiring manager can answer "is he good and can I hire him in the US" faster than today (R4, R5, R6 directly serve this).
- At least one shipped piece is memorable enough to be mentioned in an interview or shared ("how did you do the portrait?").
- Nothing shipped contains a fabricated number, an LLM-generated claim without a source, or a template-flavoured decoration — every element derives from real data (git history, content collections, dates, the actual photo).
- Downstream: ce-plan can take any single R-ID from this doc and plan it without inventing product behaviour.

---

## Scope Boundaries

- **Ship 3–4 of the ten, not all ten.** A site with two sharp signature details reads as taste; ten reads as a template. Selection happens at planning time.
- **Rejected: console command palette (⌘K)** — considered and cut by Korab.
- **Rejected: self-tailoring console** (visitor pastes a JD, site generates a `/for/` page live via LLM pipeline) — too far from the subtle, design-first direction chosen. Could be revisited as a separate brainstorm if the job search runs long.
- **Rejected: terrain contour map and ignition trace treatments** for the commit-history visual — mockups reviewed; the shift log grid (R9) was chosen.
- **Displaced: career uptime footer line** — superseded by R9 (both were "personality via real numbers"; R9 is stronger).
- **Considered, not included: interactive decision simulator** inside case studies — overlaps R10 with far more effort.
- No portfolio-site (korabeland.github.io) work; all ten target korabeland.com.

---

## Key Decisions

- **Deliberate mix lens**: roughly half functional utility, half creative/memorable, each justified by the operator/AI background — chosen over pure operator-credibility, pure AI-capability, or pure memorability framings.
- **R1 replaces the command palette** after two rejected alternatives; constraint set by Korab: the animation must finish as the current portrait image.
- **R9 treatment**: shift-log grid chosen over terrain map and ignition trace after reviewing visual mockups (cheapest, most familiar shape; memorability traded for effort).
- **Anti-slop guards are requirements, not suggestions**: every number real (derived from git, content collections, dates), amber stays the only signal colour, animations run once and respect reduced motion, no LLM-generated claims without sources.

---

## Dependencies / Assumptions

- R9 needs GitHub contribution data at build time (GraphQL contributions API requires a token; REST alternatives to be evaluated in planning). Seed-fallback pattern already exists (`src/content/trail-register/commits.seed.json`).
- R7 depends on the day-shift tokens already specced in DESIGN.md §2 (verified present).
- R4 builds on the existing config-driven `/for/[slug]` system (verified present).
- R1 SVG output must respect a hard path-data byte budget — prior topo work showed dense generated geometry can inflate pages 10–30×.
- Assumption: relocation details in R5 (Easton MD, US citizen, no sponsorship) are stable enough to publish; confirm wording with Korab before shipping.

---

## Outstanding Questions

### Resolve Before Planning

- [Affects all][User decision] Which 3–4 of the ten ship first? (R5 is near-free and closes a real screening gap; R1 is the signature piece; suggest R5 + R1 + two others.)

### Deferred to Planning

- [Affects R1][Needs research] Photo-to-line-art pipeline technique (edge/flow-field extraction, hatching generation, crossfade-to-raster mechanics) and where hand-tuning happens.
- [Affects R9][Technical] GitHub contributions data source: GraphQL with token vs. scraping-free alternatives; build-time fetch wiring on Vercel.
- [Affects R7][Technical] Toggle persistence (localStorage vs. cookie) and default-by-local-time behaviour; interaction with prod smoke tests.
- [Affects R6][Technical] Print stylesheet vs. dedicated print-shaped route; PDF export expectations.
