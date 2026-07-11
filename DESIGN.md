# DESIGN.md — korabeland.com

**Current system: "The Operator's Console"** (locked 2026-07-03).

The full, canonical design spec lives one level up, in the brand workspace:
**`Personal_Brand/DESIGN.md`** — that is the single source of truth. Change it
there first; this repo is downstream.

This file used to hold the pre-console **trail-map** spec (Fraunces / Inter
Tight, topographic-map metaphor). That system was retired on 2026-07-03 and its
401-line spec removed here to stop it contradicting the shipped design. The
console spec supersedes it entirely.

## What lives where

| Artifact | Location | Role |
|---|---|---|
| Human-readable design spec | `../DESIGN.md` (parent `Personal_Brand/`) | Source of truth — edit here first |
| Machine-readable tokens | `src/styles/tokens.css` | Regenerated to match the spec; the in-repo design surface every component reads |
| Component reference | `docs/design/components.md` | The component layer — every component's props, variants, states, a11y. Descriptive; cites this spec |
| This file | `korabeland.com/DESIGN.md` | Pointer + provenance note only |

## Section map (for the `DESIGN.md §N` references in code comments)

Code and config cite section numbers from the parent spec:

- **§4 Layout grammar** — status rail, outcome ledger, fact strip, metrics block
- **§5 Motion budget** — the five approved motion moments
- **§7 Accessibility** — WCAG AA, both day/night shifts audited before release

See `BaseLayout.astro`, `CaseStudy/`, and `playwright.config.ts` for the
in-code references those numbers resolve to.
