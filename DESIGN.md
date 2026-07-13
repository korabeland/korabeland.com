# DESIGN.md — korabeland.com

**System: "The Operator's Console"** — locked 2026-07-03. Supersedes the March 2026 spec (Inter/amber "calm front door") and the trail-map system. The site is a career portfolio whose job is to get interviews: a hiring manager answers *who is this, what does he do, is he good, how do I reach him* in ten seconds. The site reads as an instrument panel: metrics before prose, every number real, understated confidence.

This file is the source of truth for korabeland.com's design system. It used to live one level up in the `Personal_Brand/` workspace; it was moved here on 2026-07-11 so the spec lives in the repo it governs.

| Layer | Lives in | Role |
|---|---|---|
| Design decisions (this file) | `DESIGN.md` | Source of truth — edit here first |
| Machine tokens | `src/styles/tokens.css` | Regenerated to match §2–3; the surface every component reads |
| Component catalogue | `docs/design/components.md` | Each component's props, variants, states, a11y |

Token source of truth. `src/styles/tokens.css` is regenerated to match this file — change here first.

---

## 1. Principles

1. **Proof over polish.** Case studies with outcomes are the product; the design frames them.
2. **Every number real.** No fabricated stats, ever. Numbers derive from content collections or approved case-study facts.
3. **One signal accent.** `--signal` marks what matters (status, active, focus) — amber by night, indigo/periwinkle by day (a cool complement drawn from the portrait). Green appears only as a semantic "shipped/positive" state. Nothing else competes.
4. **Scanned, not read.** Status rail, ledgers, fact strips. Prose earns its place after the data.
5. **Understated confidence.** No banner, no hype, no exclamation marks. (The old availability strip is gone — visible open-to-work copy was removed wholesale in PR #30; job-seeking context stays LLM-facing only.)

## 2. Colour — dark-first, two shifts

Default (no attribute) is **night** — the console. `[data-time="day"]` is the **day shift** light mode. Legacy palettes (rainforest/alpine/mesa/boreal) and dawn/dusk states retire.

| Token | Night (default) | Day shift | Role |
|---|---|---|---|
| `--paper` | `oklch(0.21 0.01 250)` ≈ #16181c | `oklch(0.955 0.006 100)` ≈ #f2f1ea | Ground |
| `--paper-2` | `oklch(0.24 0.012 250)` ≈ #1d2026 | `oklch(0.925 0.008 100)` ≈ #e9e7de | Raised panel |
| `--ink` | `oklch(0.93 0.008 100)` ≈ #e9e8e0 | `oklch(0.23 0.012 250)` ≈ #1a1d22 | Text |
| `--ink-soft` | `oklch(0.72 0.01 110)` ≈ #a6a99c | `oklch(0.43 0.01 250)` ≈ #565a62 | Secondary text |
| `--ink-mute` | `oklch(0.62 0.01 110)` ≈ #8a8d81 | `oklch(0.52 0.01 250)` ≈ #6d717a | Recessive meta |
| `--rule` | `oklch(0.31 0.012 250)` ≈ #2c3037 | `oklch(0.88 0.008 100)` ≈ #dbd9cf | Hairlines |
| `--signal` | `oklch(0.75 0.12 70)` ≈ #d99a3c (amber) | `oklch(0.48 0.15 268)` ≈ #3a55b1 (indigo) | **The signal** — status, active, focus. Night amber, day indigo (the portrait's complement) |
| `--moss` | `oklch(0.62 0.06 145)` ≈ #6a8f6a | `oklch(0.48 0.06 145)` ≈ #4a6f4d | Semantic "shipped/positive" only |
| `--moss-soft` | `oklch(0.40 0.04 145)` | `oklch(0.78 0.04 145)` | Shipped fill/halo |

Contrast rules (WCAG AA, carried from the previous system): small mono text (≤13px) sits on `--ink-soft`, never `--ink-mute`; `--ink-mute` is reserved for larger recessive meta or bordered chips. Every pairing must pass in both shifts. Focus ring: `0 0 0 2px var(--paper), 0 0 0 4px var(--signal)`.

**Why the day signal is cool, not amber.** Bright amber cannot clear AA on cream paper — the darkest passable amber is a muddy ochre (~4.5:1 ceiling). Day mode instead takes indigo/periwinkle, the true complement of the illustrated portrait's orange field (the same hue already in the glasses and eyes). It clears AA with headroom (5.9:1 on day paper) and gives day its own identity rather than reading as a dimmed night. Night keeps amber (the field's warm counterpart). One signal *role* (`--signal`), two shift-specific hues — analogous to how `--paper`/`--ink` swap per shift.

## 3. Typography

- **Schibsted Grotesk** — display + body. Weights 400 / 500 / 700, italic 400. Display 700 with tight tracking (−0.02em); body 400 at 16–17px.
- **JetBrains Mono** — 400 / 500. Every number, label, status, datum, eyebrow. `font-variant-numeric: tabular-nums` wherever digits align.
- Fraunces and Inter Tight are fully retired (imports, tokens, OG images, deps).
- Italic is rare: ledes and quotes only. Never for emphasis.
- Scale: display ~40–48px (700) · section 24px (500) · body 16–17px · mono meta 10.5–11px uppercase.

## 4. Layout grammar

- **Status rail** — the site chrome is a readout: wordmark · shift toggle · nav (mono labels) · contact CTA. Active nav = signal underline.
- **Outcome ledger** — homepage work index: rows of `name · datum · status chip`, hairline-separated, tabular numerals. Status chips: signal = in flight, moss = shipped.
- **Fact strip** — top of every case study: Role / Scope / Span / Status in a bordered mono grid.
- **Metrics block** — bordered rows of `metric label · mono value`, placed before or immediately after the first prose block.
- **Section head** — the recurring section grammar: mono t-label heading over a 1px `--ink` underline, optional mono more-link on the right. One component (`src/components/SectionHead.astro`), never re-implemented per page.
- Sharp radii (0 default), 1px hairlines, left-aligned everything.
- **Three content widths, tokenised** (`--w-prose` 680px · `--w-shell` 960px · `--w-page` 1280px in `src/styles/tokens.css`). Prose pages and case-study body copy sit on `--w-prose`; index shells (home, /work, /lab, /notes) and the case-study header/fact strip on `--w-shell`; outer chrome (header, page-main, footer, reading room) on `--w-page`. No other container max-widths — `ch`-based caps on individual text blocks are fine. (Consolidated 2026-07-12 from eight ad-hoc widths: 620/680/760/820/960/1000/1280/1320.)
- **One mobile stacking breakpoint: 680px**, matching the prose measure (CSS custom properties cannot reach `@media`, so the value is repeated literally — it is documented here and in `tokens.css`). Sidebar collapses (reading room, 1200px) are a different job. Deliberate exception: the fact strip's 5→2 column collapse at 800px is a grid-density call — five mono facts don't fit between 680 and 800.

## 5. Motion budget — seven moments

1. Ledger rows stagger in once on page load (~40ms/row, opacity+4px rise).
2. The availability status dot breathes (re-tuned `breathe` keyframe, slow) — now the `StatusChip` pulse variant, one component across the site.
3. Reading-progress meter on case-study pages.
4. Hero headline rotates its subject on a slow fade (server-renders the default; JS-only).
5. Metric readouts count up from zero when scrolled into view (case studies).
6. Shift-log cells brighten under the cursor — the instrument torch, busy cells only (shipped 2026-07, deliberate exception documented in `ShiftLog.astro`).
7. The home hero portrait returns a glance: its painted eyes track the cursor as it moves near the image, and make direct eye contact when the cursor pauses or crosses into the face.
   - **Envelope.** Home hero only, no other render of the `Portrait` component engages. The eyes follow the cursor across the whole engagement area, including over the portrait itself, rather than locking to contact the moment the cursor is inside. A proximity band around the image (the portrait's half-width plus a small halo, so it hugs the picture — reaching about a tenth of a portrait-width past each edge rather than half) still bounds engagement and rests the gaze on exit, but its role is distance attenuation only: travel eases to a floor with distance, and the eyes rest beyond the band. Travel is capped at a deliberately small ceiling so the movement reads as a glance, not a stare.
   - **Behaviour.** Saccadic, not pursuit. Each eye holds a fixation and jumps to a new bearing on the main sequence: jump duration scales with distance, a fast ballistic profile with a small overshoot and corrective settle on the largest jumps, then stillness with sub-pixel drift between jumps. Eye contact is reached by a fixation classifier, not a timer: when the cursor holds still for a short window the gaze settles to direct contact, and it settles the same way whenever the cursor enters a measured zone over the face. That return to contact eases gently — slower than a tracking jump — so disengaging relaxes back to the viewer rather than snapping. Per-eye bearings converge on near targets, capped so the eyes never cross. Temperament is data keyed off the `data-time` shift: day is alert (quicker jumps, fuller travel), night is drowsy (slower jumps, reduced travel).
   - **Occlusion.** The eye is a layer sandwich: a painted iris and pupil sprite is the only thing that moves, riding within a lid aperture punched into an occluder patch, over a sclera underlay with the iris retouched out, beneath a fixed catchlight layer. The base `<picture>` assets are byte-identical to today's portrait, so nothing about the shipped image or the LCP path changes.
   - **Gates.** The repo's double gate: `pointer: fine` **and** not `prefers-reduced-motion`. Touch, reduced-motion, and no-JS visitors get the static portrait, the designed state rather than a degradation. The rig mounts post-load, fetches its layers, and reveals only once every layer has decoded, always at rest. A reduced-motion switch mid-visit snaps the gaze to rest and hides the rig; a shift toggle snaps to rest in the same frame as the palette swap.
   - **Resolved-state guarantee.** The layers are additive: the shipped portrait asset and its `<picture>` markup are byte-identical, and the resting layers reproduce the painted eye so the visible resolved state is today's portrait. Nothing is added to the LCP path before load. Because the screenshotted path is reduced-motion, the rig never engages there, so visual baselines and LCP are unchanged by construction.

Nothing else animates beyond 150–200ms hover/focus transitions. Moments 1–3 respect the global CSS reduced-motion guard; 4–7 are JS enhancements that server-render their static end-state and self-disable under `matchMedia("(prefers-reduced-motion: reduce)")` (the CSS guard can't stop scripted mutation). Amended from three to five in the experience-ledger plan (2026-07-04), to six for the shift-log torch, and to seven for the portrait gaze rig (2026-07-11). Moment 7 was rebuilt to the layered fixation rig (v2) on 2026-07-12. (A plotted-portrait draw-in was explored alongside the gaze and parked — unbuilt, unretired — so this moment is worded for gaze only.)

## 6. Voice

All copy follows `Personal_Brand/.claude/skills/voice/SKILL.md`: no em dashes, Australian spelling, insight-first openings, short sentences, no hype. Case-study facts are disclosure-cleared and immutable (see `docs/plans/2026-07-03-console-mvp.md` §Disclosure).

## 7. Accessibility

Carried over intact: WCAG AA contrast discipline, skip link, visible focus ring, 44px touch targets, keyboard navigation, `prefers-reduced-motion` guard, semantic HTML. New: both shifts audited (axe + manual) before any release.

---

*History: v1 Inter/amber "calm front door" (2026-03) → trail-map system (2026-04) → park-map precision pass approved then superseded same day (2026-07-03) → Operator's Console (this spec). Spec relocated from `Personal_Brand/DESIGN.md` into this repo 2026-07-11.*
