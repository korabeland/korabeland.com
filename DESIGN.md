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
- Sharp radii (0 default), 1px hairlines, left-aligned everything, 680px prose measure, 960px shell.

## 5. Motion budget — six moments

1. Ledger rows stagger in once on page load (~40ms/row, opacity+4px rise).
2. The availability status dot breathes (re-tuned `breathe` keyframe, slow) — now the `StatusChip` pulse variant, one component across the site.
3. Reading-progress meter on case-study pages.
4. Hero headline rotates its subject on a slow fade (server-renders the default; JS-only).
5. Metric readouts count up from zero when scrolled into view (case studies).
6. Shift-log cells brighten under the cursor — the instrument torch, busy cells only (shipped 2026-07, deliberate exception documented in `ShiftLog.astro`).

Nothing else animates beyond 150–200ms hover/focus transitions. Moments 1–3 respect the global CSS reduced-motion guard; 4–6 are JS enhancements that server-render their static end-state and self-disable under `matchMedia("(prefers-reduced-motion: reduce)")` (the CSS guard can't stop scripted mutation). Amended from three to five in the experience-ledger plan (2026-07-04).

## 6. Voice

All copy follows `Personal_Brand/.claude/skills/voice/SKILL.md`: no em dashes, Australian spelling, insight-first openings, short sentences, no hype. Case-study facts are disclosure-cleared and immutable (see `docs/plans/2026-07-03-console-mvp.md` §Disclosure).

## 7. Accessibility

Carried over intact: WCAG AA contrast discipline, skip link, visible focus ring, 44px touch targets, keyboard navigation, `prefers-reduced-motion` guard, semantic HTML. New: both shifts audited (axe + manual) before any release.

---

*History: v1 Inter/amber "calm front door" (2026-03) → trail-map system (2026-04) → park-map precision pass approved then superseded same day (2026-07-03) → Operator's Console (this spec). Spec relocated from `Personal_Brand/DESIGN.md` into this repo 2026-07-11.*
