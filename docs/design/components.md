# Component Reference — korabeland.com

System: **The Operator's Console** (locked 2026-07-03). This file documents the
component layer — the reusable Astro components and global CSS primitives that
render the console. It is the missing middle between the two existing sources of
truth:

| Layer | Source of truth | This file's relationship |
|---|---|---|
| Design decisions (colour, type, motion, a11y) | `DESIGN.md` §1–7 (repo root) | Cites it; never contradicts it |
| Machine tokens | `src/styles/tokens.css` | Names the tokens components read |
| **Components** (variants, props, states, a11y) | **this file** | The catalogue |

Change design decisions in `../../DESIGN.md` (the repo-root spec) first, then
regenerate `tokens.css`, then update the affected component and this doc. This
doc is descriptive: it records what the components in `src/components/` actually
do as of 2026-07-11. If code and doc disagree, the code is right and this file is
stale — fix it.

---

## How to read this

The system has two layers:

1. **Global CSS primitives** — utility classes in `src/styles/global.css`
   (`.btn`, `.tag`, `.t-mono`, `.prose`, …). No import; available everywhere.
   Use these before reaching for a component.
2. **Astro components** — `src/components/*`. Some are genuine reusables
   (`StatusChip`, `ProjectLedger`); most are single-owner page sections promoted
   out of duplicated markup (`CaseStudy`, `ReadingRoom`, `ExperienceLedger`).
   Both are documented — a "section" component is still a contract.

Every component is server-rendered and ships **zero client JS by default**.
Three components are deliberate, gated exceptions (`OutcomeMetrics`,
`ShiftToggle`, `ShiftLog`); each server-renders its final state and enhances only
when JS + capability + motion permit. See [Cross-cutting conventions](#cross-cutting-conventions).

---

## Foundations (quick reference)

Full detail in `src/styles/tokens.css` and `DESIGN.md`. The essentials a
component author needs:

**Colour roles** (`DESIGN.md` §2). Two shifts, one token set; `[data-time="day"]`
re-pins the hues.

| Token | Role | Night | Day |
|---|---|---|---|
| `--paper` / `--paper-2` | ground / raised panel | #16181c / #1d2026 | #f2f1ea / #e9e7de |
| `--ink` / `--ink-soft` / `--ink-mute` | text / secondary / recessive | light greys | dark greys |
| `--rule` | 1px hairlines | #2c3037 | #dbd9cf |
| `--signal` | **the** accent: status, active, focus | amber #d99a3c | indigo #3a55b1 |
| `--moss` | semantic "shipped / positive" **only** | #6a8f6a | #4a6f4d |

Two hard rules, both WCAG AA: `--signal` is the *only* accent (moss is a
semantic state, not decoration); small mono text (≤13px) sits on `--ink-soft`,
never `--ink-mute`.

**Spacing** — 4px base, Tailwind-aligned: `--s-1` 4px → `--s-10` 128px.
**Radii** — sharp by default: `--r-0` 0 (cards/buttons), `--r-1` 2px, `--r-2` 4px,
`--r-pill` 9999px (dots only).
**Type** — Schibsted Grotesk (display + body), JetBrains Mono (every number,
label, status, eyebrow; `tabular-nums`).
**Focus** — `--focus-ring` = `0 0 0 2px var(--paper), 0 0 0 4px var(--signal)`,
applied globally to `:focus-visible`.
**Motion** — five approved moments (`DESIGN.md` §5); nothing else beyond
150–200ms hover/focus transitions. Global reduced-motion guard in `global.css`.

---

## Global CSS primitives

Utility classes from `src/styles/global.css`. No import; use directly in markup.

### Typography helpers

| Class | Renders | Use for |
|---|---|---|
| `.t-mono` | JetBrains Mono 11px, uppercase, `tabular-nums`, `--ink-soft` | Meta, data, status text |
| `.t-mono.small` | as above at 10.5px | Tighter captions |
| `.t-label` | Mono 10.5px/500, 0.12em tracking, uppercase | Section eyebrows (`experience`, `outcome`) |
| `.lede` | Display italic 18px, `--ink-soft` | Opening standfirst |
| `.t-display` | Display 700, tight tracking | Big headings (paired with clamp size) |
| `.t-serif` / `.italic-serif` | Display 400 (roman / italic) | Quotes, rare emphasis |
| `.prose *` | Full article type scale (h1/h2/p/ul/a/code) | Long-form bodies not inside ReadingRoom |

### Objects

| Class | What it is | States / notes |
|---|---|---|
| `.btn` | Inline mono button, 1px `--ink` border | `:hover` inverts (ink fill, paper text) |
| `.btn.ghost` | Recessive button, `--rule` border, `--ink-soft` text | `:hover` promotes border/text to `--ink` |
| `.tag` | Mono 10px pill, `--rule` border, `--ink-soft` | Static; the neutral cousin of `StatusChip --chip` |
| `.fig` | Diagonal-hatch figure placeholder | Content stand-in |
| `.pullquote` | Display italic 24px, `--moss` left border | In-article pull quote |
| `.mnote` | Mono 11px margin note; `sup` is `--moss` | Powers `ReadingRoom` RightSidebar |
| `.fn` | Superscript `--moss` footnote anchor | Inline reference marker |
| `.rule-soft` | 1px `--rule` horizontal divider | Section breaks |

> **`.tag` vs `StatusChip`** — two pill-shaped things, different jobs. `.tag` =
> neutral metadata (filed-under; no semantic colour). `StatusChip --chip` =
> *semantic status* where signal/moss carry meaning. Reach for `StatusChip`
> whenever the colour is supposed to mean something.

---

## Components

Ordered most-reusable first. Import paths are relative to `src/`.

### StatusChip

`components/StatusChip/StatusChip.astro` — the single status / availability
primitive. Consolidated three drifted inline copies (hero dot, about dot, ledger
chip). Consumers: `index.astro`, `about.astro`, `for/[slug].astro`,
`ProjectLedger`, `ExperienceLedger`.

**Use when** you need to show a status word whose colour carries meaning. The
colour is locked to semantics, not chosen per-site.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `status` | `"available" \| "in-flight" \| "current" \| "shipped"` | — (required) | Drives tone + default label |
| `variant` | `"chip" \| "pulse"` | `"chip"` | Bordered mono pill vs breathing dot + text |
| `label` | `string` | canonical word per status | Override copy (availability lines need this) |
| `class` | `string` | — | Extra classes, merged via `class:list` |

**Variants**

| Variant | Visual | Use when |
|---|---|---|
| `chip` | Bordered mono pill, tone-coloured text + border | Ledger rows, inline status |
| `pulse` | 7px breathing dot + inline text | Availability lines ("open to roles") |

**Tone map** (locked, not configurable): `available` / `in-flight` / `current`
→ `--signal`; `shipped` → `--moss`. Green means shipped, full stop.

**States**

| State | Behaviour |
|---|---|
| Default | Static chip, or a dot on a 3.2s `statuschip-breathe` box-shadow pulse |
| Reduced motion | Global guard zeroes the breathe animation; dot sits still |

**Accessibility** — the dot is `aria-hidden`; meaning lives in the adjacent text,
never colour alone. Contrast holds in both shifts.

**Do / Don't**

| ✅ Do | ❌ Don't |
|---|---|
| Let `status` pick the tone | Recolour a chip to fake a new state |
| Override `label` for availability copy | Use `shipped`/moss for anything not shipped |
| Use `pulse` for the one availability signal | Sprinkle pulses — motion budget moment #2 |

```astro
<StatusChip status="shipped" />
<StatusChip status="available" variant="pulse" label="open to roles" />
```

---

### ShiftToggle

`components/ShiftToggle/ShiftToggle.astro` — the night/day shift control (R7). A
sliding sun/moon switch. **Lives in the chrome** (`BaseLayout` header), so it is
present on every route; you never place it yourself.

**Props** — none.

**Behaviour** — knob position and icon are driven purely by
`:root[data-time]` in CSS, set by the pre-paint head script in `BaseLayout`
*before* any stylesheet applies. So the switch renders in its correct position at
first paint with no flash, independent of this component's own script.

**States**

| State | Behaviour |
|---|---|
| No-JS | Server-renders `hidden`; a no-JS visitor never sees a dead control |
| JS ready | Script reveals the button, syncs `aria-pressed` / `title` to `data-time` |
| Click | Flips `data-time`, persists to `localStorage` (explicit choice), updates `theme-color` |
| Hover / focus | Border promotes to `--signal`; `:focus-visible` shows `--focus-ring` |
| Reduced motion | Knob `transition` removed; position still correct |

**Accessibility** — `aria-label` stays the stable name ("Day shift"); state rides
`aria-pressed`. `title` names the action (icon-only control needs the hint).
Storage/attribute contract is locked across units — see `src/lib/shift.ts` and
`tests/shift-parity.test.ts`.

**Do / Don't**

| ✅ Do | ❌ Don't |
|---|---|
| Rely on `BaseLayout` to place it | Drop a second toggle on a page |
| Change shift logic in `src/lib/shift.ts` | Fork the resolution rules — parity test enforces lockstep |

---

### ProjectLedger

`components/ProjectLedger/index.astro` — the outcome-ledger list (`title · mono
outcome · status chip`). One component serving the homepage bands, `/work`, and
`/lab` (previously hand-duplicated). Route-agnostic: the caller supplies `href`.

**Use when** rendering a scannable list of case studies or projects with an
outcome datum and a status.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `LedgerItem[]` | — (required) | Rows (see shape below) |
| `headingText` | `string` | — (required) | Section heading (`.t-label`) |
| `headingId` | `string` | `"ledger-heading"` | Shared by heading + `aria-labelledby` |
| `moreLink` | `{ href, label }` | — | Home-only "all case studies →" link |
| `emptyMessage` | `string` | — (required) | Empty-state copy; differs per surface, kept verbatim |
| `stagger` | `boolean` | `false` | Home-only per-row stagger-in reveal |

`LedgerItem` = `{ slug, title, outcome, status: "shipped" | "in-flight", href }`.
The caller derives `href` via `projectHref` (category-aware `/work/<slug>` or
`/lab/<slug>`) so this component stays route-agnostic.

**States** — populated list vs `emptyMessage`; rows have a `:hover` `--paper-2`
wash (gated `@media (hover: hover)`). With `stagger`, rows animate in via the
`reveal` keyframe, `animation-delay: calc(var(--row) * 60ms)` (motion budget
moment #1). Gated by a `data-stagger` attribute, not a class, so `/work` rows
(no `--row` set) never inherit a broken `calc()`.

**Accessibility** — `<section aria-labelledby>`, semantic `<ol>`; each row is one
`<a>`. Reduced-motion guard zeroes the stagger (delay included).

**Do / Don't**

| ✅ Do | ❌ Don't |
|---|---|
| Derive `href` with `projectHref` | Hardcode `/work/…` — breaks `/lab` |
| Reserve `stagger` for the homepage | Stagger `/work`'s index (no `--row`) |

---

### ExperienceLedger

`components/ExperienceLedger/ExperienceLedger.astro` — the homepage experience
section: reverse-chron roles with quantified bullets, a `current` chip on the
active role, and a testimonial only when one exists (AE1). Consumers:
`index.astro`, `for/[slug].astro`, `dev/experience-preview.astro`.

**Props** — `roles: ExperienceSummary[]` (from `src/lib/experience.ts`). Reader
sorts; the component renders. Disclosure gate: ranges-only numbers, no vendor
names.

**Structure** — `<ol>` of roles; each row = id line (role + company),
`StatusChip status="current"` when active, mono period, bullet list with `›`
markers and optional mono metric, optional testimonial `<figure>`.

**Accessibility** — `<section aria-labelledby="experience-heading">`; semantic
`<ol>` / `<figure>` / `<blockquote>`. Bullet `›` is a CSS `::before` (decorative).

**Do / Don't** — render `StatusChip` for `current`, not a bespoke badge; keep the
disclosure gate (ranges only). Empty `roles` renders an empty `<ol>` — gate at
the page (content-gated until real roles land).

---

### SkillsSection

`components/SkillsSection/SkillsSection.astro` — skills + certifications on the
about page. Categorised term lists (`<dl>`) and a cert list with issuer/year.
Consumers: `about.astro`, `for/[slug].astro`, `dev/skills-preview.astro`.

**Props** — `data: SkillsData` (from `src/lib/skills.ts`).

**States** — categories and certifications each render only when non-empty;
whole section is gated by `readSkills()` at the page. Cert names link when
`cert.url` is set (`:hover` → `--signal`).

**Accessibility** — `<section aria-labelledby="skills-heading">`; semantic `<dl>`
for categories, `<ul>` for certs.

---

### CaseStudy

`components/CaseStudy/index.astro` — the case-study page layout (console skin).
Composes three sub-components below. Consumers: `work/[slug].astro`,
`lab/[slug].astro`. Body content arrives via `<slot>`.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — | Page title (`.t-display`) |
| `subtitle` | `string` | — | Standfirst |
| `status` | `string` | — | `"shipped"` → moss chip, anything else → signal "active" chip |
| `facts` | `Fact[]` | — (required) | Feeds `FactStrip` |
| `heroImage` / `heroImageAlt` | `string` | `""` | Keystatic filename → `public/work/` variants via `hero-picture.ts` |
| `fieldLog` | `LogEntry[]` | `[]` | Feeds `FieldLog` (renders section only if non-empty) |
| `outcomeMetrics` | `Metric[]` | `[]` | Feeds `OutcomeMetrics` |
| `reflection` | `string` | — | Reflection paragraph |
| `nextProject` | `{ href, title }` | — | Next-in-category link (must stay in-category) |
| `backHref` / `backLabel` | `string` | `/work` / `← all case studies` | Return link |
| `eyebrowLabel` | `string` | `"case study"` | Also used in "next {eyebrowLabel}" |

**Motion** — a fixed reading-progress meter (motion budget moment #3), CSS
scroll-driven via `@supports (animation-timeline: scroll())`; a static bar is the
fallback. Reduced motion freezes it (acceptable degraded state).

**Accessibility** — each block is a `<section aria-labelledby>`; the progress
track is `aria-hidden`. Prose targets generic `<p>/<h2>/<ul>/<blockquote>`.

**Sub-components** (not used standalone):

- **FactStrip** (`CaseStudy/FactStrip.astro`) — bordered mono grid, `facts:
  { label, value }[]`. 5 columns → 2 columns under 800px. Values use `.t-label`
  + `.t-mono`.
- **OutcomeMetrics** (`CaseStudy/OutcomeMetrics.astro`) — bordered rows,
  `metrics: { value, label, provenance }[]`. **JS enhancement:** clean numeric
  values count up from zero on scroll into view (motion budget moment #5), via
  `IntersectionObserver`; self-disables under reduced motion and settles the real
  value if the tab is hidden. Each row is a native `<details>/<summary>`
  disclosure answering "measured how?" (R2/AE4) — no JS needed for the
  disclosure. `.sr-only` span names the toggle without clobbering the summary's
  computed name.
- **FieldLog** (`CaseStudy/FieldLog.astro`) — chronological build entries,
  `entries: { week, title, body }[]`. Mono week column (`--signal`) + display
  title + prose body; collapses to one column under 640px.

**Do / Don't** — keep `nextProject` in-category (work↔work, lab↔lab); pass
`status="shipped"` only when truly shipped. The header status chip renders via
`StatusChip` (`label` passes the raw status text verbatim; `shipped` → moss,
anything else → signal).

---

### ReadingRoom

`components/ReadingRoom/index.astro` — three-column blog reading layout: 220px
metadata rail · 620px reading column · 260px margin-notes rail. Collapses to one
column under 1200px. Consumers: `notes/[slug].astro`. Body via `<slot>`.

**Props** (index) — `title` (required), plus `eyebrow` (`"§ field notes"`),
`titleEm` (signal-coloured tail of the title), `subtitle`, `noteNumber`, `date`,
`readTime`, `wordCount`, `tags[]`, `contents[]`, `marginNotes[]`, `backHref`
(`/notes`), `backLabel`, `heroImage` / `heroImageAlt`.

**Sub-components**

- **LeftSidebar** (`ReadingRoom/LeftSidebar.astro`) — post metadata, a "reading
  depth" cell bar (`depthFilled` / `depthTotal`, default 4/6), `filed under`
  tags (`.tag`), and a `contents` TOC with `§NN` numbering. Sticky at `top:100px`;
  static under 1200px. `aria-label="Field note metadata"`; depth bar is
  `aria-hidden`.
- **RightSidebar** (`ReadingRoom/RightSidebar.astro`) — margin-notes rail,
  `marginNotes: { superscript, body }[]`, rendered as `.mnote` blocks.

**Accessibility** — `<article>` wrapper; sidebars are `<aside>`. Body prose
targets generic tags (Markdoc output).

---

### ShiftLog

`components/ShiftLog/ShiftLog.astro` — GitHub contribution grid in console
grammar (R9). Consumer: `index.astro`.

**Props** — `data: ContributionData` (from `src/lib/shift-log.ts`; never
hardcoded).

**Structure** — a mono **summary line** (total · busiest week · streak) computed
from the real data, a staleness caption, and a 52–53×7 cell grid inside a
recessed instrument panel (`--paper-2`, `--rule`, `--r-2`). Cells carry an
intensity class 0–4; the ramp mixes `--signal` over `--paper` in **oklab** (not
oklch — oklch would detour through green in both palettes). A `less → more` legend
reuses the swatches.

**JS enhancement — cursor torch.** The component's first client JS: busy cells
(intensity 3–4) bloom toward the pointer. **Double-gated** on `pointer: fine`
*and* motion allowed, so touch and reduced-motion visitors get the static framed
grid untouched. Cell centres are cached from layout-derived `offset*` (scroll-
and transform-immune); the bloom is cleared on `mouseleave`.

> **Motion-budget note:** `DESIGN.md` §5 enumerates *five* motion moments and does
> not yet list this torch (added later, in R9). Real behaviour, six moving parts;
> the spec's list is stale here. Flagged, not invented — reconcile in `DESIGN.md`
> §5 when it is next touched.

**Accessibility** — the mono summary line *is* the accessible representation; the
grid, ticks, and legend are `aria-hidden` decoration on top of it. Small mono
uses `--ink-soft` for AA in both shifts.

---

### Portrait

`components/Portrait/index.astro` — the day/night illustrated-portrait
`<picture>` pair, toggled purely by CSS off `data-time` (mirrors the ShiftToggle
idiom: orange field by night, blue by day). Consumers: `index.astro`,
`about.astro`.

**Props** — `sizes` (required, per-surface), `alt` (default "Illustrated portrait
of Korab Eland").

**Notes** — serves **static** AVIF/WebP/JPEG variants from `public/portrait/`
(generated by `scripts/gen-hero-variants.ts`), *not* `astro:assets`: with
`imageService: true` the Vercel optimiser ignores requested widths for
`astro:assets` sources and shipped the portrait at full 1200w (mobile-LCP audit
caught it). Loads `eager` / `fetchpriority=high` (it's the LCP image). Throws at
build if variants are missing — run the generator.

**Do / Don't** — pass a real per-surface `sizes`; regenerate variants via the
script, never hand-place files.

---

### OffTrail

`components/OffTrail/OffTrail.astro` — the shared 404-adjacent empty state.
Consumers: `404.astro` (unknown URL) and `off-trail.astro` (known but unshipped
route via `?from=<slug>`).

**Props** — `from?: string`. Known slugs (`notes` → "field notes", `work` → "case
studies") get a subline "…: not live yet"; any unknown value falls back to
generic copy.

**Structure** — mono `no signal` eyebrow (`--signal`), one display line, optional
subline, and a `.btn` back to `/`. `<section aria-labelledby="off-trail-title">`.

---

### PostContent

`components/PostContent.tsx` — the one React island. Renders Keystatic's
`fields.markdoc()` AST through Markdoc's React renderer. Consumers:
`work/[slug].astro`, `lab/[slug].astro`, `notes/[slug].astro`.

**Props** — `document: { node } | Node` (Keystatic reader output). Not a visual
component; it emits plain `<p>/<h2>/<ul>` that the parent layout (`CaseStudy` /
`ReadingRoom`) styles via `:global`. Styling belongs to the host layout, not
here.

---

## Shell — BaseLayout

`layouts/BaseLayout.astro` — the page shell for every route. Not a component you
compose, but the contract every page renders inside.

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | — (required) | `<title>` + `og:title` |
| `description` | `string` | site default | Meta + OG description |
| `active` | `"home" \| "notes" \| "projects" \| "work" \| "lab" \| "about" \| "colophon"` | — | Which nav item gets the signal underline + `aria-current="page"` |
| `ogImage` / `ogType` | `string` | — / `"website"` | Social card |
| `noindex` | `boolean` | — | Utility/preview routes |
| `fullBleed` | `boolean` | `false` | `<main>` edge-to-edge (home kiosk owns its containers) |
| `hideFooter` | `boolean` | `false` | Home renders its own closing strip |

**Provides** — skip link (`#main`), sticky chrome (wordmark · mono nav ·
`ShiftToggle` · signal-filled `get in touch` CTA), `<main class="page-main">`
(max-width 1280, or full-bleed), and the default footer with the availability
echo. Slots: `head`, `jsonld`.

**The shift script** — a render-blocking `is:inline` head script (first node in
`<head>`) resolves the shift before any stylesheet applies: `?shift=` query →
`localStorage` (explicit) → `sessionStorage` (session default) → clock
(`07:00–18:00` = day). Any failure falls back to night. It mirrors
`src/lib/shift.ts` `resolveShift` exactly; the copies are kept in lockstep by
`tests/shift-parity.test.ts` (do not edit one without the other).

**Nav** — the `NAV_LINKS` array (`work · lab · notes · about · colophon`) is the
single source; add routes there.

---

## Cross-cutting conventions

Patterns every component obeys. Enforced by review, tests, and the global CSS.

**Zero-JS default.** Components server-render complete. The three JS exceptions
(`OutcomeMetrics` count-up, `ShiftToggle`, `ShiftLog` torch) each render their
final/static state first and enhance only when capability and
`prefers-reduced-motion` allow. New JS needs the same justification.

**Day/night shift.** One token set; `[data-time="day"]` re-pins hues. Anything
that must differ per shift toggles off `:global(html[data-time="day"])` in CSS —
never a second render (`Portrait`, `ShiftToggle` are the reference idiom). The
pre-paint head script guarantees no flash.

**Semantic colour (`DESIGN.md` §2–3).** `--signal` is the *only* accent —
status, active, focus. `--moss` means "shipped/positive" and nothing else. Don't
introduce a third accent or recolour for decoration.

**Motion budget (`DESIGN.md` §5).** Five approved moments: (1) ledger stagger
[`ProjectLedger`], (2) availability pulse [`StatusChip`], (3) reading progress
[`CaseStudy`], (4) hero headline rotation [`index.astro`], (5) metric count-up
[`OutcomeMetrics`]. Everything else is a 150–200ms hover/focus transition. The
`ShiftLog` cursor torch is a sixth, added in R9 and not yet reflected in §5.
Reduced motion: CSS moments respect the global guard (which zeroes duration *and*
delay); JS moments self-disable via `matchMedia`.

**Accessibility baseline (`DESIGN.md` §7).** WCAG AA in *both* shifts (axe +
manual before release), skip link, visible `--focus-ring`, semantic HTML,
decorative layers `aria-hidden` with the meaning in adjacent text. Small mono
(≤13px) sits on `--ink-soft`, never `--ink-mute`.

**Contract locks.** Some values are enforced across files: the shift storage
keys/attributes (`src/lib/shift.ts` ↔ the head script, guarded by
`shift-parity.test.ts`), and semantic status→tone (`StatusChip`). Change these at
the source, not the call site.

---

## Coverage & gaps

16 component files (11 top-level + 5 sub-components) + shell documented.

**Resolved in this pass:** the duplicate status chip in `CaseStudy/index.astro`
was folded into `StatusChip` (styling was already byte-identical), and the dead
`docs/design/tokens.css` (retired trail-map era, imported nowhere) was deleted.

Remaining — not code bugs, worth a future tidy:

| Gap | Where | Note |
|---|---|---|
| Motion budget stale | `DESIGN.md` §5 | Lists five moments; `ShiftLog` torch (R9) is a sixth. Reconcile in `DESIGN.md` §5. |
| Status vocab split | `StatusChip` key `in-flight` vs display label "in flight" | Consistent but ad-hoc; the key-vs-label mapping is worth a single glossary. |

---

*Generated 2026-07-11 from `src/components/` and `src/layouts/BaseLayout.astro`.
Descriptive, not normative — design decisions live in `../../DESIGN.md` (this
repo's root spec).*
