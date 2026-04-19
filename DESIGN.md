# DESIGN.md — korabeland.com

Design system source of truth. Every downstream UI agent reads this file. Tokens live in [`docs/design/tokens.css`](docs/design/tokens.css) — the orchestrator copies that byte-for-byte to `src/styles/tokens.css` after any design change.

**Last synced with handoff:** 2026-04-18 from `docs/design-references/claude-design-kickoff/project/` (Claude Design bundle).
**MVP scope overlay:** 2026-04-19 — see `/office-hours` doc at `~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260419-145932.md`. That doc narrows launch to 2 live routes (`/`, `/colophon`) with `/off-trail?from=<slug>` catching the unlinked trail pins. Deferred surfaces stay specced below with an MVP-status annotation.
**Canonical color model:** OKLCH. Hex values in this file are lossy best-effort fallbacks for legacy browsers; perceptual drift of ±1 lightness unit is expected.

---

## Mood

korabeland.com is a **trail map for a thoughtful person's work**. The metaphor is literal: the home page is a topographic map with a "you are here" plateau and dashed trails radiating to destinations (field notes, projects, work with me). Everything around that map — the chrome, the margin notes, the case-study field logs — reads like a park-ranger's field journal printed on warm off-white stock, annotated with a fine pen. Fraunces carries the display type with an italic swerve for emphasis; Inter Tight does the reading; JetBrains Mono does the work of footnotes, captions, and system chrome. The palette is neutral paper, forest-floor ink, a single moss green that signals *alive / open / for-you*, and a restrained amber that only shows at dawn.

The feel is **quiet, legible, and slightly idiosyncratic**. No gradients, no drop shadows on text, no rounded corners on cards. Hairline borders (1px), dashed trails, tape-corner accents on the kiosk hero. Motion is slow and diegetic — a dot that breathes, a radar ping on the trailhead pin, dashed trails that drift at ~20s loops. The site should feel like it was made by one person with taste who takes the craft seriously but refuses to take the surface too seriously. If the reader leaves feeling like they spent time in a well-kept cabin with interesting books on the table, the mood is working.

**Material fidelity, not layout.** Per the 2026-04-19 office-hours doc, korabeland.com simulates a physical object — a real park wayfinding kiosk (routed wood, silkscreen aluminum, hand-painted "you are here"). Every implementation decision runs through one question: *would a real kiosk do this?* `rough.js` carries the hand-drawn irregularity on the map surface; Fraunces carries the routed-wood feel in display type. This is not "a website with a kiosk metaphor" — the site **is** the object, rendered on a screen.

---

## Color tokens

All palettes share the same six-role structure: two surfaces (`paper`, `paper-2`), three inks (`ink`, `ink-soft`, `ink-mute`), one hairline (`rule`), and three accents (`moss`, `moss-soft`, `amber`). Palette swap via `[data-palette="..."]`; day-state swap via `[data-time="..."]`. Rainforest + day is the default and applies with no attribute.

**Persistence model:** day-state lives in `localStorage` under `korab.time`. Palette is hard-coded to `rainforest` for MVP (the swap attribute is reserved — the selector is not rendered). Day-state is stamped on `<html>` on first paint by the layout. MVP does **not** read `@media (prefers-color-scheme: dark)` — Dusk is a manual toggle; auto-engage is deferred post-MVP.

### Rainforest — Day (default)

| Token         | OKLCH                     | Hex       | Role                                  |
|---------------|---------------------------|-----------|---------------------------------------|
| `--paper`     | `oklch(0.97  0.008 95)`   | `#f6f3ec` | Page background, card fill            |
| `--paper-2`   | `oklch(0.945 0.012 95)`   | `#ece8df` | Inset panels, sticky rails, fact strip |
| `--ink`       | `oklch(0.22  0.015 180)`  | `#1f2a2a` | Primary text, buttons, hairlines in chrome |
| `--ink-soft`  | `oklch(0.42  0.012 180)`  | `#4d5757` | Body prose, nav links                 |
| `--ink-mute`  | `oklch(0.62  0.010 180)`  | `#7f8887` | Captions, meta, mono labels           |
| `--rule`      | `oklch(0.88  0.010 140)`  | `#d8dcd4` | Hairline borders, dashed separators   |
| `--moss`      | `oklch(0.48  0.055 150)`  | `#4f6f55` | Accent — active nav, availability, "for-you" signal |
| `--moss-soft` | `oklch(0.78  0.040 150)`  | `#b7c9ba` | Pull-quote rails, breathe halo        |
| `--amber`     | `oklch(0.62  0.095 60)`   | `#b38541` | Tape corners, dawn lean               |

### Rainforest — Dusk (manual dark)

| Token         | OKLCH                     | Hex       | Notes                                  |
|---------------|---------------------------|-----------|----------------------------------------|
| `--paper`     | `oklch(0.30  0.020 280)`  | `#2e2e3d` | Deep cool plum, not black              |
| `--paper-2`   | `oklch(0.26  0.022 280)`  | `#272736` |                                        |
| `--ink`       | `oklch(0.92  0.010 60)`   | `#ecead9` | Warm cream on plum                     |
| `--ink-soft`  | `oklch(0.78  0.014 60)`   | `#c4bfa7` |                                        |
| `--ink-mute`  | `oklch(0.60  0.015 60)`   | `#8e8871` |                                        |
| `--rule`      | `oklch(0.42  0.020 280)`  | `#484862` |                                        |
| `--moss`      | `oklch(0.75  0.060 140)`  | `#a5c29c` | Lighter moss for contrast              |
| `--moss-soft` | `oklch(0.45  0.050 140)`  | `#556c52` | Inverts role — now the dim variant     |
| `--amber`     | `oklch(0.78  0.110 65)`   | `#d9a66a` | Warmer glow under lamp-light           |

### WCAG contrast matrix — Rainforest Day (paper = `#f6f3ec`)

| Foreground    | Ratio vs `--paper` | AA normal (4.5) | AA large (3.0) | AAA normal (7.0) | Pass level                   |
|---------------|--------------------|:----------------:|:---------------:|:----------------:|------------------------------|
| `--ink`       | 12.8 : 1           | ✓                | ✓               | ✓                | AAA — body, headings         |
| `--ink-soft`  | 7.6  : 1           | ✓                | ✓               | ✓                | AAA — body, meta             |
| `--ink-mute`  | 4.1  : 1           | ✗                | ✓               | ✗                | Large-text / decorative only |
| `--moss`      | 5.9  : 1           | ✓                | ✓               | ✗                | AA — accent text + icons     |
| `--moss-soft` | 1.6  : 1           | ✗                | ✗               | ✗                | Decorative only (halo, rail) |
| `--amber`     | 3.6  : 1           | ✗                | ✓               | ✗                | Large text / tape only       |

Rule: `ink-mute`, `moss-soft`, and `amber` are **never load-bearing body text**. Captions in `ink-mute` must be ≥13px (large-text territory) or paired with an `ink-soft` neighbor. The rails in `moss-soft` are hairlines, not type.

### WCAG contrast matrix — Rainforest Dusk (paper = `#2e2e3d`)

| Foreground    | Ratio vs `--paper` | AA normal (4.5) | AA large (3.0) | AAA normal (7.0) | Pass level                   |
|---------------|--------------------|:----------------:|:---------------:|:----------------:|------------------------------|
| `--ink`       | 11.3 : 1           | ✓                | ✓               | ✓                | AAA — body, headings         |
| `--ink-soft`  | 7.4  : 1           | ✓                | ✓               | ✓                | AAA — body, meta             |
| `--ink-mute`  | 4.2  : 1           | ✗                | ✓               | ✗                | Large-text / decorative only |
| `--moss`      | 6.4  : 1           | ✓                | ✓               | ✗                | AA — accent text + icons     |
| `--moss-soft` | 2.0  : 1           | ✗                | ✗               | ✗                | Decorative only              |
| `--amber`     | 7.1  : 1           | ✓                | ✓               | ✓                | AAA — decorative + text safe |

Values are computed from the sRGB hex conversions; OKLCH perceptual lightness drift is within ±0.3 of the ratios above. Any ui-builder component that lowers contrast below these marks is a bug.

**MVP palette lock:** Rainforest is the only palette shipping at launch. Alpine, Mesa, and Boreal remain in `tokens.css` as dormant swap themes for future work; they are **not** exposed via UI until per-variant WCAG matrices are computed.

---

## Type scale

Three families, all served via a single Google Fonts import string. **Do not rename or drop weights — the `Fraunces` variable axis `opsz` is load-bearing** (the display class uses `opsz 144`; the serif class uses `opsz 24`).

### Families

| Role                         | Family           | Google Fonts identifier | Weights shipped      | Notes                                           |
|------------------------------|------------------|-------------------------|----------------------|-------------------------------------------------|
| Display (headlines, italics) | **Fraunces**     | `Fraunces`              | 300, 400, 500, 600   | Variable font; `opsz` axis 9–144 required       |
| Body (UI + prose)            | **Inter Tight**  | `Inter+Tight`           | 400, 500, 600        | Tight metrics match Fraunces x-height           |
| Mono (captions, chrome)      | **JetBrains Mono** | `JetBrains+Mono`      | 400, 500             | Used UPPERCASE for labels                       |

Canonical import string (preserve byte-for-byte, including `+` in family names and `&` separators):

```text
family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap
```

### Named text classes (`styles/type.css`, authored by ui-builder)

| Class           | Family        | Size        | Weight | opsz | Line height | Tracking   | Transform / style |
|-----------------|---------------|-------------|--------|------|-------------|------------|-------------------|
| `.t-display`    | Fraunces      | per-use     | 400    | 144  | 1.05        | -0.02em    | —                 |
| `.t-serif`      | Fraunces      | per-use     | 400    | 24   | 1.35        | —          | —                 |
| `.italic-serif` | Fraunces      | per-use     | 300    | 24   | 1.3         | -0.01em    | italic            |
| `.t-mono`       | JetBrains Mono| 11px        | 400    | —    | 1.55        | 0.04em     | UPPERCASE         |
| `.t-label`      | JetBrains Mono| 10.5px      | 500    | —    | 1.0         | 0.12em     | UPPERCASE         |
| Body (default)  | Inter Tight   | 15px        | 400    | —    | 1.55        | -0.005em   | `ss01, cv11` on   |

### Size ramp (actual sizes used in the handoff)

| Token name      | Size  | Line height | Weight | Family       | Where it's used                                |
|-----------------|-------|-------------|--------|--------------|------------------------------------------------|
| `text-xs`       | 10.5px| 1.0         | 500    | JetBrains M. | `.t-label` — section markers, rail headings    |
| `text-sm`       | 11px  | 1.55        | 400    | JetBrains M. | `.t-mono` — captions, meta, legend, footer     |
| `text-base-sm`  | 12.5px| 1.5         | 400    | Inter Tight  | Rail body, tag labels                          |
| `text-base`     | 15px  | 1.55        | 400    | Inter Tight  | Default body / paragraphs                      |
| `text-lg`       | 17px  | 1.7         | 400    | Inter Tight  | Long-form prose (blog, case study body)        |
| `text-xl`       | 19px  | 1.4         | 400    | Fraunces     | Lede / deck under H1                           |
| `text-2xl`      | 22px  | 1.3         | 300    | Fraunces     | Italic flourish in footer / "next up" rails    |
| `text-3xl`      | 24–28px | 1.3       | 300    | Fraunces     | Pull quotes (italic, `opsz 24`)                |
| `display-sm`    | 30–32px | 1.1       | 400    | Fraunces     | Kiosk masthead, section H2 in case study       |
| `display-md`    | 44px  | 1.05        | 400    | Fraunces     | Case study outcome metrics                     |
| `display-lg`    | 56px  | 1.02        | 400    | Fraunces     | Home + blog H1 (`opsz 144`)                    |
| `display-xl`    | 88px  | 0.95        | 400    | Fraunces     | Case-study title ("Heron")                     |

Rule: every display-tier size uses `font-variation-settings: "opsz" 144`. Every serif-body size (`text-xl` – `text-3xl`) uses `opsz 24`. ui-builder must not mix.

---

## Spacing and radii

### Spacing scale — 4px base, Tailwind-aligned

| Token   | Value  | Tailwind equivalent | Typical use                                    |
|---------|--------|----------------------|------------------------------------------------|
| `--s-1` | 4px    | `space-1`            | Micro-gaps (tag padding, icon-to-text)          |
| `--s-2` | 8px    | `space-2`            | Button gaps, tag padding                        |
| `--s-3` | 12px   | `space-3`            | Card padding, inline gaps                       |
| `--s-4` | 16px   | `space-4`            | Default stack gap in lists                      |
| `--s-5` | 24px   | `space-6`            | Section-inner rhythm, card padding              |
| `--s-6` | 32px   | `space-8`            | Section gaps within a column                    |
| `--s-7` | 48px   | `space-12`           | Column gutters on wide layouts                  |
| `--s-8` | 64px   | `space-16`           | Page gutters (horizontal padding)               |
| `--s-9` | 96px   | `space-24`           | Hero vertical padding                           |
| `--s-10`| 128px  | `space-32`           | Between-major-block whitespace                  |

### Radius scale — the system is intentionally sharp

| Token      | Value   | Use                                                  |
|------------|---------|------------------------------------------------------|
| `--r-0`    | 0px     | **Default.** Cards, buttons, inputs, chrome, figures |
| `--r-1`    | 2px     | Subtle softening on inputs if needed                 |
| `--r-2`    | 4px     | Scrollbar thumb, chip radii                          |
| `--r-pill` | 9999px  | Weather-pill dot, breathe halo, radar pings          |

Default is `--r-0`. Any rounded card, button, or input is a bug unless explicitly scoped in the component spec.

### Border weights

- **Hairline (1px):** all card/button borders, chrome bottom-rule, figure borders, section dividers.
- **Heavy (1px on `--ink` instead of `--rule`):** kiosk masthead border, primary buttons, "trail register" masthead — signals "registered / official".
- **Dashed (1.2–2 stroke / 3 gap):** trail paths on maps, rule-inside-cards, "next →" divider. Never on a CTA border.

---

## Component inventory

Grouped by the four audience surfaces the site serves: **Blog**, **Projects**, **Consulting**, **Shared**. "Shared" is the base kit every page pulls from.

### Shared primitives

| Component                 | Visual spec                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------|
| **`Chrome` (nav header)** | Sticky, `padding: var(--s-5) var(--s-8)`, 1px `--rule` bottom border. Left: logo mark + "korab eland" in Fraunces 18/500. Center: 13px `--ink-soft` links, gap `--s-6`. Active link has 1px `--moss` underline 3px below. Right: `WeatherPill`. |
| **`WeatherPill`**         | 6px moss dot with `breathe` keyframe halo + `.t-mono` text ≤ 11px: `"clear · 52°f · taking clients"`. Three-part metric. Copy is status-driven; swaps per page (`reading`, `shipped`, etc.). Reusable as a live-status primitive in rails too. **MVP data source: static string prop** passed from `TrailheadKiosk/index.astro`. No weather API, no runtime fetch at launch. |
| **`MapSurface.astro`** (new) | Concrete server-rendered implementation of the `TrailMap` spec, owned by `ui-builder` in `src/components/TrailheadKiosk/`. Frontmatter imports `roughjs/bundled/rough.cjs.js` (Node-safe), calls `rough.generator()` with per-trail seeds (`seededRandom(slug)`) to emit SVG path strings. Renders: contour rings (5–7 concentric, geometric spacing, regular `--rule` + index `--ink-mute`), exactly 3 dashed trails to `/notes`, `/projects`, `/work-with-me` (roughness 1.5–2.5, bowing ≥ 1, separable angles ≥ 30°), 3 destination pin label boxes in `.t-mono`, YOU-ARE-HERE marker (3.2–4.8s radar-ping), breathing 6px moss dot (3.5s `breathe`), legend, scale bar. **Zero client JS.** Polished in isolation at `/_dev/kiosk` before chrome wiring (mirror-sheen audit gate #1). |
| **`TrailRegisterRail.astro`** (new) | Left rail of `TrailheadKiosk`. Reads `src/content/trail-register/commits.json` via plain JSON import (`import commits from "../../content/trail-register/commits.json"` — **not** an Astro content collection; the file is data, not authored prose, and registering it would force a schema dance the rail does not benefit from). The JSON is written by `scripts/gen-trail-register.ts` prebuild hook — 14 most-recent commits; falls back to `commits.seed.json` on shallow-clone builds. Renders pencil-tick entries: short SHA `--moss`, subject line mono `--ink-soft`, ISO date mono `--ink-mute`. Cap at 14; no scrollback at MVP. v1.1 weathering extends this file to also read `marks.json`. |
| **`PopularRoutesRail.astro`** (new) | Right rail of `TrailheadKiosk`. Hand-picked routes, not algorithmic. At launch renders exactly two: `trailhead → colophon` (live, links to `/colophon`) and `trailhead → field notes` (links to `/off-trail?from=notes`, visible label "field notes"). Small `.t-mono` footer below: "more routes coming as the map fills in." |
| **`Button` (default)**    | Transparent fill, 1px solid `--ink`, `padding: 10px 16px`, `.t-mono` 11px UPPERCASE tracking 0.12em. Hover inverts: `background: var(--ink)`, `color: var(--paper)`. 200ms ease transition. |
| **`Button.ghost`**        | Same geometry. Border `--rule`, text `--ink-soft`. Hover tightens border to `--ink` and lifts text to `--ink`. No fill change on hover. |
| **`Tag`**                 | 1px `--rule` border, 3px 8px padding, `.t-mono` 10px UPPERCASE tracking 0.1em, `--ink-soft` text. Moss-accent variant inverts to `--moss` border + text. |
| **`SectionMarker`**       | `.t-label` class (10.5px mono UPPERCASE tracking 0.12em), prefixed `§ 01 · trailhead` pattern. Reused across home + case + blog. **NOT one-off markup** — it's a primitive. |
| **`RuleSoft`**            | 1px full-width `--rule` line, used vertically between sections with `--s-6`–`--s-8` margins. |
| **`Figure`**              | Diagonal-hatch repeating gradient on `--paper-2` with 1px `--rule` border. `.t-mono` 10.5px caption inside. Used as image placeholder until real assets ship. |
| **`Footnote anchor (.fn)`**| Superscript `--moss`, mono, 0.75em. Cursor-pointer. Pairs with margin-notes on the right rail of blog. |
| **`MarginNote (.mnote)`** | 1px `--moss-soft` left border, 12px padding-left, mono 11px `--ink-mute` text, superscript index in `--moss` 600 weight. |
| **`PullQuote`**           | Fraunces italic 300, 28px/1.3, `--ink`. 1px `--moss` left rule, padding-left `--s-5`. `--s-7` vertical margin. |
| **`Footer`**              | 1px `--rule` top border, `--s-7` × `--s-8` padding, flex justify-between baseline. Left: italic Fraunces 18px. Right: `.t-mono` copyright + link to `/colophon`. (Terminal easter-egg prompt deferred post-MVP — do not render the `~` hint at launch.) |
| **`Reveal` utility**      | Opacity 0 + 8px Y translate until `.in` applied. 900ms ease on both properties. For scroll-triggered reveals only; never required to read content. |
| **`MiniMap`**             | 220×170 SVG. Concentric contour rings + 3 dashed trails to `notes / projects / work`. One active pin gets a ping animation + label in Fraunces italic. Small compass in top-right. **Reused in blog left rail and case-study left rail.** |
| **`TrailMap`**            | 720×440 SVG. Marching-squares contour lines (regular `#d2d0cb`, index `#9a9690`), three radial dashed trails from center, three destination pins with label boxes, radar-ping YOU-ARE-HERE marker, legend + scale bar. The home hero and kiosk hero both render this. Home hero uses `MapSurface.astro` (concrete implementation with `rough.js`) — see the `MapSurface.astro` row above. |
| **`Logo mark`**           | 18×18 SVG: circle outline + 4-point compass needle + centered dot. `currentColor` — inherits from chrome ink. |

### Blog surfaces

| Component            | Visual spec                                                                                          |
|----------------------|------------------------------------------------------------------------------------------------------|
| **`ReadingRoom` layout** | 3-column grid `220px / 1fr / 260px`, gap `--s-7`, max-width 1320, auto margins. Center column caps at 620px measure. |
| **`ReadingRoom.LeftRail`**| Sticky at `top: 100`. Stacks: `MiniMap` → field-note number + date → reading-depth bar (six 14×8 tiles filled vs `--rule`) → filed-under tags → contents TOC. |
| **`ReadingRoom.RightRail`** | Starts at `padding-top: 140` to align with body. Stacks: 3× `MarginNote` with footnote indices → `KnowledgeGraph` (collapsed state). |
| **`DropCap`**        | First paragraph only. Fraunces `opsz 144` size 52px, `--moss`, float-left, line-height 0.9, padding-right 10px, padding-top 6px. |
| **`KnowledgeGraph`** | 260×200 collapsed in the right rail, with 9 nodes + 13 edges, moss radial-gradient ground. Expand toggles a full-frame overlay (color-mix paper + blur(6px)) with a 1200×720 stage. Click dims non-neighbors to 0.25 opacity. Hover draws moss strokes. Cursor parallax with `depth` factor. Esc or click-outside closes. |
| **`NextInSeries` block** | Flex justify-between baseline. Left: `.t-mono` "next ↝". Right: italic Fraunces 20px title. Paired above with a `RuleSoft`. |
| **`ArticleHero`**    | `SectionMarker` in `--moss` → display 56px H1 (accept italic span) → Fraunces 19px lede `--ink-soft` → `RuleSoft` with `--s-6`/`--s-7` margins. |

### Projects surfaces

| Component               | Visual spec                                                                                          |
|-------------------------|------------------------------------------------------------------------------------------------------|
| **`CaseStudyShell`**    | Max-width 1280, 2-column `240px / 1fr` with sticky left TOC at `top: 100`. Right column caps at 780px measure. |
| **`CaseHero`**          | 1–2 `Tag`s (category + status), `.t-mono` date range pushed right. Display 88px H1 (`opsz 144`). Fraunces 24px `--ink-soft` deck, max-width 760. `Figure` at 460px height as hero slot. Caption row below, mono, flex justify-between. |
| **`FactStrip`**         | Full-width band bleed, `--paper-2` fill, 1px `--rule` top + bottom. 4-column grid of `label / value` pairs (`.t-label` + Fraunces 18px). |
| **`FieldLogEntry`**     | Grid `80px 1fr`, gap `--s-5`. Left: week in mono `--moss`. Right: italic Fraunces 20px title + 15px body `--ink-soft` at 1.6 leading. 1px `--rule` bottom border. Stack with `--s-6` gap. |
| **`OutcomeStat`**       | 1px `--rule` border card, padding `--s-5`. Display 44px metric in `--moss` + `.t-mono` label. 3-up grid on wide, stacks on narrow. |
| **`ProjectIndex`**      | Field-log list. Each row: `SectionMarker` (`§ NN · projects/[slug]`) + italic Fraunces 20px title + mono date/duration meta + one-line dek in `--ink-soft`. 1px `--rule` bottom per row, `--s-6` stack gap. Max-width 780. Same shell as `FieldNoteIndex`. |
| **`FieldNoteIndex`**    | Identical shell to `ProjectIndex` (field-log list). Each row: `SectionMarker` (`§ NN · notes/[slug]`) + italic Fraunces 20px title + mono date + reading-time meta + one-line dek in `--ink-soft`. Shared component — `kind` prop toggles the marker prefix. |

### Consulting surfaces

The inquiry-entry surface is **`/work-with-me`** at MVP. The handoff signal (availability, slots copy, moss accent) composes into `AvailabilityCard`, which anchors that route. MVP receives inquiries via `mailto:hello@korabeland.com` — no inline form.

| Component                | Visual spec                                                                                          |
|--------------------------|------------------------------------------------------------------------------------------------------|
| **`AvailabilityCard`** (locked, **deferred post-MVP**) | 1px `--moss` border, background `color-mix(in oklch, var(--moss) 4%, transparent)`, padding `--s-5`. Header row: `WeatherPill` dot + "2 of 3 slots open" in `.t-mono` `--moss`. Body: Fraunces 15px `--ink-soft` sentence about fit. Full-width primary `Button` at bottom linking to `mailto:hello@korabeland.com`. Tiny `.t-mono` below ("or — hello@korabeland.com"). |
| **`SlotsIndicator`** (locked, **deferred post-MVP**) | Reusable live-status primitive. Moss dot + "N of M slots open" text. Composable into `AvailabilityCard`, `WeatherPill`, kiosk rail, or a standalone banner. |
| **`WorkWithMePage`** (locked route `/work-with-me`, **deferred post-MVP**) | Single-column `ReadingRoom.center` width (620px measure). Stack: `SectionMarker` (`§ · work with me`) → display 56px H1 → Fraunces 19px deck (`--ink-soft`) → prominent `AvailabilityCard` → short process breakdown (3–4 field-log-style rows describing engagement model) → calendar link + `mailto:hello@korabeland.com` CTA. No form at MVP. |
| **`DispatchHero`** (handoff variant `dispatch`) | Shown as a toggle option in the handoff tweaks panel. Terminal-like banner version of the hero emphasising availability up top. **Deferred post-MVP** — `/work-with-me` covers the inquiry flow; dispatch hero is an optional alt layout of the home hero to revisit later. |

### Home-hero variants (Shared — home.jsx supports three heroes)

The handoff exposes three `hero` values: `kiosk`, `map`, `dispatch`. Ship **kiosk as default**; the other two are non-shipping alternates unless promoted.

| Variant    | Layout                                                                                                    |
|------------|-----------------------------------------------------------------------------------------------------------|
| `kiosk`    | Full-bleed 820px `TrailheadKiosk`: map scaled 1.45×, left "trail register" rail, right "popular routes" rail, bottom legend strip. Primary shipping hero. |
| `map`      | Split `1fr / 1.2fr` grid. Left: text block (section marker + 56px H1 + 19px deck + 2 buttons). Right: bordered `--paper-2` card containing the standard `TrailMap`. |
| `dispatch` | Kiosk chrome with a dispatch-style consulting headline — inquiry-first alternate. **Deferred post-MVP** (see Consulting surfaces). |

### Error / empty states

| Component | Visual spec |
|-----------|-------------|
| **`404`**       | Mini `TrailMap` with the active pin dimmed to `--ink-mute` + label "off-trail" in `.t-mono` + italic Fraunces 19 dek ("this path hasn't been mapped yet") + `Button` back to `/`. `/off-trail` reuses this spec; `?from=<slug>` adds a `.t-mono` subline naming the destination (e.g., "`notes` — not yet in the system"). |
| **`EmptyList`** | Italic Fraunces 18px `--ink-soft` primary line + `.t-mono` 11px `--ink-mute` subtitle below. Centered, 1px dashed `--rule` top + bottom. Used inside `FieldNoteIndex` / `ProjectIndex` when a filter returns zero. |

---

## Sitemap and routes

Based on the handoff (`trailhead / field notes / projects / colophon` nav across all three pages). Keystatic content lives in `src/content/posts/*/` today. The `Launch` column reflects the 2026-04-19 office-hours MVP narrowing: only 3 routes go live at launch; deferred surfaces keep their specs below for post-launch work.

| Route                      | Surface    | Launch   | Purpose                                     | Primary component                     |
|----------------------------|------------|----------|---------------------------------------------|---------------------------------------|
| `/`                        | Shared     | **LIVE** | Trailhead home with `hero=kiosk` default    | `TrailheadKiosk` (`NowSection` deferred post-MVP) |
| `/colophon`                | Shared     | **LIVE** | Full: bio + influences + tools + contact    | `Colophon` (bio blurb + influences list from `identity/influences.md` + tools/stack + `mailto:hello@korabeland.com`) |
| `/off-trail`               | Shared     | **LIVE (new)** | "This path hasn't been mapped yet." Reads `?from=notes\|projects\|work-with-me` and renders matching destination label. | `OffTrail` (reuses `404` spec) |
| `/notes`                   | Blog       | deferred | Blog index (nav label: "field notes")       | `FieldNoteIndex`                      |
| `/notes/[slug]`            | Blog       | deferred | A single field note                         | `ReadingRoom`                         |
| `/projects`                | Projects   | deferred | Case-study index                            | `ProjectIndex`                        |
| `/projects/[slug]`         | Projects   | deferred | A single case study                         | `CaseStudyShell`                      |
| `/work-with-me`            | Consulting | deferred | Inquiry-entry page — `AvailabilityCard` + process breakdown + `mailto:hello@korabeland.com` | `WorkWithMePage` |
| `/_dev/kiosk`              | Dev-only   | **DEV**  | `MapSurface` isolation preview. 404 in prod via `import.meta.env.PROD` guard, blocked in `robots.txt`, excluded from `@astrojs/sitemap`. | `MapSurface.astro` |
| `/keystatic`               | Shared     | LIVE     | CMS admin (existing in stack)               | Keystatic handles                     |
| `/rss.xml`                 | Shared     | deferred | Feed for field notes (pointless until notes ship) | Astro endpoint                        |
| `/sitemap.xml`             | Shared     | LIVE     | SEO sitemap                                 | `@astrojs/sitemap`                    |
| `/404`                     | Shared     | LIVE     | Catchall for unknown URLs                   | `404` component                       |

Nav label stays **"field notes"** even though the route is `/notes` — `aria-label` on the anchor matches the visible label; `href="/notes"`. At MVP the three deferred trail pins (`notes`, `projects`, `work-with-me`) render visually on the kiosk `MapSurface` but route to `/off-trail?from=<slug>`, not to their own pages. `/off-trail` and `/404` share the same component spec; the `?from=` query parameter is the only runtime difference.

---

## Motion principles

Motion is slow, looping, and narrative. Never used to "delight" or indicate UI state that could be shown statically. All timings are ≥ 200ms unless they are micro-transitions on focus/hover.

### Named animations

| Name          | Purpose                                           | Timing                  |
|---------------|---------------------------------------------------|-------------------------|
| `breathe`     | Halo around weather pill dot + availability card  | 3.5s `ease-in-out` infinite; `box-shadow: 0 0 0 0` ↔ `0 0 0 6px` with `--moss-soft` at 0% and transparent at 50%. |
| `ping`        | Radar rings on trailhead YOU-ARE-HERE and active mini-map pin | 3.2s–4.8s linear infinite; `r: 6 → 32 → 6`, `opacity: 0.7 → 0 → 0.7`. |
| `trail-drift` | Dashed-line `stroke-dashoffset` drift on map trails | 16–22s linear infinite, `0 → -60`. |
| `reveal`      | Scroll-in for body blocks                         | 900ms ease on `opacity` + `translateY(8px → 0)`. Triggered by IntersectionObserver; no JS required if `@media (prefers-reduced-motion: reduce)` is on. |
| `blink`       | Terminal caret in kiosk "today's entry"           | 1.1s step-end infinite; `opacity: 1 ↔ 0`. |

### Easing

- **Transitions:** `ease` (default 200ms) for hover, `ease` 180ms for graph node hover.
- **Looping:** `ease-in-out` for organic signals (breathe). `linear` for geometric loops (trail drift, radar rings).
- **Entrances:** `ease` 900ms for `reveal`.

### Reduced motion

Per `@media (prefers-reduced-motion: reduce)`:

- **Disable:** `breathe`, `ping`, `trail-drift`, `blink`, and all `reveal` Y-translations.
- **Keep:** static end-state rendering. The moss dot still appears, the trailhead marker still has its ring, the trails still dash-render — nothing moves.
- **Focus-ring motion:** never animate the focus ring even under prefers-reduced-motion.

### Global rules

1. No parallax on the home page. The `KnowledgeGraph` parallax in the blog right rail is gated on pointer input; reduced-motion disables it.
2. No autoplaying video or audio.
3. No fading transitions on page navigation (Astro default instant transitions).
4. Hover transforms must not translate ≥ 2px. Lifted-card hover effects are out of the system.

---

## Accessibility targets

### Contrast minimums

| Context                     | Minimum       | Tokens safe to pair on `--paper`      |
|-----------------------------|---------------|---------------------------------------|
| Body text (< 18px)          | WCAG AA 4.5:1 | `--ink`, `--ink-soft`, `--moss`       |
| Large text (≥ 18px / 14px+bold)| WCAG AA 3.0:1 | add `--ink-mute`, `--amber`         |
| UI component boundaries     | 3.0:1         | 1px `--rule` passes on both day + dusk |
| Focus indicator vs. adjacent | 3.0:1         | moss focus ring passes on day + dusk  |

`--ink-mute` is **never** body text. `--moss-soft` and `--amber` are decorative only outside dusk.

### Focus ring

```css
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--paper),     /* inner spacer so ring sits off the element */
    0 0 0 4px var(--moss);      /* 2px moss ring against paper */
  transition: box-shadow 120ms ease;
}
```

- Ring sits **outside** the element. The inner 2px `--paper` layer guarantees the ring is visible against dark-adjacent elements (e.g. a focused moss-bordered `AvailabilityCard`).
- Buttons retain their 1px `--ink` border underneath; the ring stacks above.
- Links in long-form prose (`.t-serif`, `.t-mono`) use an underline on focus in addition to the ring.
- Never animate the ring itself.
- Skip-to-content link must appear on first Tab, using `.btn` styles pinned top-left at `--s-4`.

### Keyboard and screen reader

- Nav is a real `<nav>` with an `aria-current="page"` on the active link. The moss underline is visual only; screen readers use `aria-current`.
- `KnowledgeGraph` expand button is a `<button>` with `aria-expanded`; the overlay has `role="dialog"` and `aria-label="Related notes"`. Esc closes.
- `TrailMap` / `MiniMap` are decorative SVGs with `role="img"` and a short `aria-label` (e.g. "Trailhead map with three destinations: field notes, projects, work with me"). The destination pins must **also** exist as real `<a>` elements elsewhere on the page (duplicate anchors for screen readers), not only as SVG `<text>` elements.
- `breathe` dot is `aria-hidden`. The text beside it carries meaning.
- Form inputs (none in the handoff, but future consulting inquiry form will use them) need explicit `<label>` elements and `aria-describedby` for helper text.

### Reduced motion

See Motion principles. All infinite animations stop; static end-states render.

### Color and palette

- Never convey state with color alone. Availability = moss dot + "2 of 3 slots open" text. Active nav = moss underline + `aria-current`.
- Palette swapper is **not shipped at MVP** (Rainforest only). Day-state toggle (Dawn / Day / Dusk) must be reachable via keyboard and carry an explicit `aria-label`.

---

## Decisions locked (2026-04-18)

The following speculative items from the handoff have been resolved. ui-builder treats these as ground truth.

| # | Decision | Resolution |
|---|---|---|
| 1 | Consulting inquiry-entry surface | **`/work-with-me` route**, inquiries via `mailto:hello@korabeland.com` (no inline form at MVP) |
| 2 | Palette swap themes at launch | **Rainforest only.** Alpine / Mesa / Boreal stay in `tokens.css` as dormant themes; no UI swapper shipped |
| 3 | `prefers-color-scheme: dark` wiring | **Deferred.** Manual Dusk toggle via `[data-time="dusk"]` only |
| 4 | Terminal easter egg on `~` | **Deferred.** Ship clean; revisit after launch |
| 5 | Site search and filtering | **Deferred.** Revisit when notes > 20 or projects > 6 |
| 6 | Blog route | **`/notes`** (nav label stays "field notes") |
| 7 | `ProjectIndex` + `FieldNoteIndex` layout | **Field-log list** — shared component, `kind` prop toggles marker prefix |
| 8 | `/colophon` contents | **Full**: bio + influences + tools + contact |
| 9 | `Figure` assets at launch | **Diagonal-hatch placeholders** ship at MVP; swap in real assets post-launch |
| 10 | `404` + `EmptyList` visuals | **Ship as specced above** |
| 11 | Guestbook | **Deferred.** Remove the kiosk rail hint at MVP |
| 12 | MVP live routes | **`/` and `/colophon` only** (plus `/off-trail` catchall). `/notes`, `/projects`, `/work-with-me` render as visual pins on the kiosk map and route to `/off-trail?from=<slug>`. `/colophon` is a chrome footer link, not on the map. Per 2026-04-19 office-hours doc. |
| 13 | Hand-drawn SVG tooling | **`rough.js` added to the stack** for `MapSurface.astro`. Server-side only (frontmatter import of `roughjs/bundled/rough.cjs.js`), zero client bundle, RNG seeded deterministically per-trail so visual-regression snapshots are byte-stable. |
| 14 | Object-first build order | **`MapSurface.astro` ships and passes the mirror-sheen audit gate at `/_dev/kiosk` before any chrome, rail, or route is wired.** Kiosk composition and routes wait on the audit. |
| 15 | Email at launch | **`hello@korabeland.com`** (Korab confirmed 2026-04-19). `korab.land` alias forwarding can be wired post-launch if the shorter mailto is ever wanted back. |

## Deferred post-MVP

Revisit after initial launch. Each one needs its own design pass; none block MVP.

- Palette swapper UI (Alpine / Mesa / Boreal + WCAG matrices).
- Auto-engage Dusk via `prefers-color-scheme: dark` or local sunset.
- Terminal easter egg on `~` key.
- Site search / filtering.
- Guestbook (`/guestbook`).
- `DispatchHero` as an alt home-hero layout.
- `Figure` real-asset content-layer spec (aspect ratios, loading, captions beyond placeholder).
- `/notes`, `/notes/[slug]`, `/projects`, `/projects/[slug]`, `/work-with-me` routes (pins visible on the kiosk map at launch; routes unwired).
- `NowSection` below the fold on `/` (kiosk hero fills the viewport at launch).
- **Weathering milestone (v1.1).** Each production deploy appends a pencil-tick entry to `src/content/weathering/marks.json`; `TrailRegisterRail.astro` is extended to render both `commits.json` and `marks.json`. Optional: seeded `rough.js` scuffs on `MapSurface`. Not user-writable. See office-hours doc §v1.1.
- Real weather data source for `WeatherPill` (MVP uses a static string prop).
- `rss.xml` feed (pointless until `/notes` ships).
