# Operator's Console — MVP Implementation Plan

**Supersedes:** the homepage/IA portions of `2026-07-03-park-map-redesign.md`. Its Phase 1 typography decision (Schibsted Grotesk + JetBrains Mono, Fraunces/Inter Tight retire) and craft/a11y constraints carry over. Its map phases retire with the map.
**Context:** korabeland.com is now primarily a career portfolio to help Korab land AI / Data / Product / CX-strategy roles. Timeline compressed: apps in flight. Direction "The Operator's Console" chosen 2026-07-03 from a three-direction concept board. Copy below is approved and disclosure-cleared by Korab (redlines applied 2026-07-03) — do not alter facts or add specifics; wording tweaks only if Korab asks.
**Branch:** `redesign/console` (branched from `redesign/park-map` to keep the hero-image WIP in `99bf1f7`).

## North star

The site as an instrument panel. A hiring manager must answer in 10 seconds: who is this, what does he do, is he good (show me), how do I reach him. Metrics before prose. Every number real. Understated confidence — no hype, no banner.

## Locked spec

- **Ground & signal:** dark-first. Deep cool ink ground (~`#16181c` — express in OKLCH per token conventions), warm bone text (`#e7e6df`-ish), hairlines `#2c3037`-ish, **amber** (`#d99a3c`-ish) as the single signal colour, muted green (`#6a8f6a`-ish) reserved for "shipped" status. Light "day shift" mode via the existing OKLCH day-state infrastructure (tokens swap, components don't). Preserve WCAG AA discipline documented in `tokens.css`/`global.css` comments.
- **Type:** Schibsted Grotesk (400/500/700, italic 400) display+body; JetBrains Mono (400/500) for every number, label, status, datum. `font-variant-numeric: tabular-nums` wherever digits align. Fraunces + Inter Tight fully removed (imports, tokens, `og.png.ts` via `@fontsource/schibsted-grotesk`, deps) — follow park-map plan Phase 1 steps 2–7.
- **Layout grammar:** status rail (site chrome doubles as readout), outcome ledger (homepage), fact strip atop each case study, metrics before prose. Sharp radii stay. Left-aligned everything.
- **Motion budget (exactly 3):** ledger rows stagger in once on load; status dot breathes (re-tune existing `breathe-halo`); reading-progress meter on case-study pages. Nothing else. Reduced-motion guard carries over.
- **Availability line (clear-but-understated):** `● open to ai / data / product roles` — mono, amber dot, in the status rail. No hire-me banner anywhere.
- **Retires:** TrailheadKiosk map hero, MiniMap, KnowledgeGraph embeds, tape corners, weather metaphor. Colophon keeps the git build-log (`gen-trail-register.ts` untouched).
- **Survives:** OKLCH token infra, CI/visual suite, Keystatic, a11y work (skip link, focus ring), wordmark "korab eland", CaseStudy layout (re-skinned), ReadingRoom for /notes.

## MVP scope (in order)

1. `/` — status rail · positioning · outcome ledger (real entries) · short about teaser · contact.
2. `/work/lead-scoring` + `/work/ai-sms-pilot` — the two approved case studies (copy below) in the projects collection (`/projects` routes rename to `/work`; redirect old path).
3. `/about` — short career narrative (13 years: media buying → marketing → CX → AI initiatives), how-I-operate paragraph (personal-os, no sensitive detail), photo from `identity/profile-photos`, resume link.
4. Resume: PDF from `identity/Korab_Eland_Resume.docx` — needs Korab's export or a print-CSS resume page; do NOT auto-convert without checking output quality.
5. Contact: email + LinkedIn in rail/footer.
6. Post-MVP (not now): remaining case studies, /notes restyle, personal-os deep-dive, LinkedIn tune-up.

## Positioning (homepage lead)

> I turn ambiguous problems into systems that ship.
> 13 years across marketing, CX and operations — now building the AI-driven kind.

(Set the second line without an em dash in final copy: "…operations. Now building the AI-driven kind." Voice rules: `Personal_Brand/.claude/skills/voice/SKILL.md` — no em dashes anywhere in site copy, Australian spelling, insight-first.)

## Approved case-study copy (disclosure-cleared — treat facts as immutable)

### A · Lead scoring: fixed tiers to a decile model

Fact strip: Role "Led strategy + evidence" · Scope "Admissions · marketing · paid media · data" · Span "Jan → Q4 2026" · Status "ML build greenlit". Employer: Keypath Education, named. Rail: `case study · 01 / track · evidence → ml / status · model in build`.

> We were calling our lowest-tier leads **hundreds of times for every application they produced**. When we stopped calling them, conversion held. Applications arrived on their own timeline, and the team got real capacity back. One analysis changed how the business thought about effort.
>
> It also bought the mandate for something better. Fixed tiers treat every lead in a bucket the same. A **decile model** scores each lead on expected conversion probability, so call strategy, nurture sequencing and media spend can follow the evidence instead of the rulebook. I ran alignment sessions with six stakeholders across admissions, marketing, paid media and data engineering, synthesised where they converged, and took the model to senior leaders. They endorsed v1.
>
> Then the groundwork. I audited the lead signals we actually had and wrote the analysis query myself: **around 600k leads with point-in-time features**. I set an interpretability requirement so the team could trust the scores, and briefed data engineering. The model build is scheduled behind a data-platform migration, and the whole workstream is documented to run without me as the dependency.

Metrics: "Call effort on lowest tier, per application — hundreds → 0" · "Conversion impact of removing those calls — none measured" · "Stakeholders aligned, across four functions — 6" · "Dataset assembled for model build — ~600k leads".

### B · AI SMS engagement: the 10× cheaper vendor, chosen on evidence

Fact strip: Role "End-to-end pilot lead" · Vendors assessed "2, head-to-head" · Price delta "10×+" · Design "Randomised holdout". Rail: `case study · 02 / track · ai pilot / status · go-live planned july` (update to "live" at launch).

> A lead that messages at 11pm doesn't wait until morning. Failed contacts and after-hours enquiries leak conversion quietly, and no advisor roster can cover them. Rather than a big platform bet, I scoped a contained pilot: **AI-driven SMS engagement on new leads, measured properly**.
>
> Two vendors made the shortlist. The mature option had the stronger security posture. The challenger was **more than 10× cheaper**, with a more flexible API and faster iteration. We compared them across ten technical dimensions with our engineering lead, and I made the uncomfortable call: take the challenger and **close the security gap in the contract**. I led the vendor through our security review and worked the protections into the agreement alongside legal.
>
> The measurement design is the part I'd defend anywhere. **All new leads across two partner programs, a randomised holdout control** assigned at the record level, treatment versus control booking rate as the primary metric, downstream conversion as the check, two months. If it works, we'll know exactly what it's worth. The pilot also doubles as the evidence base for a build-vs-buy decision on an in-house engagement platform.

Metrics: "Vendor cost difference at pilot scale — >10×" · "Technical dimensions compared — 10" · "Control design — randomised holdout" · "Pilot window — 2 months".

## Disclosure rules (hard constraints — audit before every commit touching content)

- NEVER: colleague names, vendor names (Enrola, Student Ignite), university partner names (SCU, JCU, UTS, UNSW, UoM, VU, Sunway…), contract clauses/prices, OKR text, org politics, comp, role-transition context.
- Ranges only: 290 → "hundreds"; $2.5k vs $34k → "more than 10×"; 628,176 → "around 600k".
- Keypath Education: named. Function names: allowed. "Our CRM" / "a data-platform migration": generic (Korab may later approve naming Dynamics 365 / Fabric — flagged, not approved).
- Grep gate before PR: `rg -i "enrola|student ignite|scu|jcu|unsw|uom\b|\b290\b|34,?425|34k|628" src` returns nothing.

## Phases (one commit each; `pnpm verify` before every commit)

1. `feat(design): console tokens + cartographic type retire` — dark-first token set as default, day-shift light mode, font swap per park-map Phase 1 steps (og.png.ts, package.json deps — orchestrator-only, main session).
2. `feat(home): status rail + positioning + outcome ledger` — replace TrailheadKiosk composition; ledger rows from real content collections; availability line from siteMeta.
3. `feat(work): /work routes + two case studies` — collection entries with approved copy; CaseStudy layout re-skin; redirect /projects → /work.
4. `feat(about): career narrative + contact` — /about page, contact links, resume slot (placeholder link until PDF approved).
5. `feat(motion): the three moments` — ledger stagger, status-dot breathe, reading-progress. `@supports`-guarded, reduced-motion safe.
6. `test(visual): reset baselines for console redesign` — full gate: `pnpm verify:all`, axe/Lighthouse, 375/768/1280 light+day-shift sweep, disclosure grep gate, screenshots for PR. Push, PR to main, Korab reviews on Vercel preview. Do NOT merge.

## Constraints

- AGENTS.md §3 orchestrator-only paths; barrels via `pnpm gen:barrels`; Keystatic trailing-slash path locked; Astro 6 + Keystatic 5 peer-dep state accepted; commit trailer per repo convention.
- Voice skill (`Personal_Brand/.claude/skills/voice/SKILL.md`) governs any new copy: no em dashes, Australian spelling, insight-first.
