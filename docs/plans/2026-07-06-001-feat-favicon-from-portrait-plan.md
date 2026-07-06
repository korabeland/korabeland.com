---
title: "feat: Browser-tab favicon from the illustrated portrait"
type: feat
status: completed
created: 2026-07-06
depth: lightweight
---

# feat: Browser-tab favicon from the illustrated portrait

## Problem Frame

The site currently ships **no favicon**. There is nothing in `public/` and no
`<link rel="icon">` anywhere in the page shell, so browsers render a blank/globe
placeholder in the tab and a bare `/favicon.ico` probe 404s.

The goal is a small version of the home-page profile image — the illustrated
portrait — showing next to the page title/URL in the browser tab (and as the
iOS home-screen icon when the site is bookmarked). The portrait is the same
`astro:assets` image already used for the hero on the home page and the small
26px "operator badge" in the header rail on interior pages, so the tab icon
should read as the same face at thumbnail scale.

**Source image:** `src/assets/portrait-illustrated.jpg` — 1040×1040, already
square, so no cropping is required; it downscales cleanly to icon dimensions.

## Scope

**In scope**
- Emit favicon `<link>` tags from the shared page shell so every route gets the
  icon (the head is defined once in `BaseLayout.astro`).
- Derive the icon from the existing portrait asset at build time (single source
  of truth — swapping the portrait later updates the favicon automatically).
- Include an iOS `apple-touch-icon` so a bookmarked/home-screened site shows the
  same face rather than a screenshot.
- A head-assertion test proving the icon links exist and resolve.

**Out of scope / non-goals**
- No change to the portrait image itself, the hero, or the header badge.
- No page-layout, styling, or design-token changes.
- No new brand mark or bespoke tab-optimised glyph (this is explicitly the
  photo, shrunk down).

### Deferred to Follow-Up Work
- A committed static `public/favicon.ico` root fallback for legacy clients
  (feed readers, old crawlers) that probe `/favicon.ico` directly rather than
  reading the `<link>` tag. Modern browsers honour the link tag, so this is a
  belt-and-suspenders nicety, not required for the tab to render. See Risks.
- A higher-contrast, tab-optimised crop if the full portrait reads as too busy
  at 16–32px in practice. Evaluate visually after shipping; swapping the source
  passed to the icon generator is a one-line change.

---

## Key Technical Decision

**Generate the icon at build time from the imported portrait via Astro's image
pipeline (`getImage` from `astro:assets`), rather than committing static PNG
files to `public/`.** (Confirmed with user, 2026-07-06.)

Rationale:
- **Single source of truth.** The favicon is derived from the same asset the
  hero and header badge already import. If the portrait is ever replaced, the
  favicon regenerates automatically — no stale committed icon to forget.
- **No manual image-processing step** to get wrong; `sharp` (already a
  dependency, Astro's default image service) does the resize deterministically.
- The image params (fixed `src`, fixed dimensions) are static, so Astro
  resolves and emits the optimised PNGs at **build time** even under
  `output: 'server'` — the browser fetches a static hashed asset, not a
  per-request render.

Accepted trade-off: the icon href is a hashed pipeline URL, not a clean
`/favicon.png`, and there is no literal `/favicon.ico` at the root. Modern
browsers use the `<link rel="icon">` and never depend on the root probe, so the
tab icon renders regardless. The root-fallback nicety is deferred above.

Icon set (right-sized minimal):
- `rel="icon"` PNG at **32×32** — the browser-tab icon. (Optionally also 16×16;
  a single 32px PNG downscales acceptably, so 16px is optional, not required.)
- `rel="apple-touch-icon"` PNG at **180×180** — iOS home-screen / bookmark icon.

Force `format: 'png'` on generation — the favicon/apple-touch-icon contexts want
PNG, not the modern formats (avif/webp) the pipeline would otherwise prefer.

---

## Implementation Units

### U1. Emit favicon + apple-touch-icon links from the page shell

**Goal:** Every page renders a browser-tab favicon and an iOS touch icon derived
from the illustrated portrait.

**Requirements:** The tab icon is a shrunk-down version of the home-page profile
image (primary request); the same icon covers iOS bookmarks.

**Dependencies:** none.

**Files:**
- `src/layouts/BaseLayout.astro` — the portrait is *already imported here*
  (`import portrait from "../assets/portrait-illustrated.jpg"`). Add the icon
  generation in frontmatter and the `<link>` tags in `<head>`.

**Approach:**
- In the component frontmatter, call `getImage` from `astro:assets` twice
  against the existing `portrait` import — once at 32×32 and once at 180×180,
  each with `format: "png"` — to obtain the resolved asset URLs.
- Add the corresponding `<link>` tags to `<head>` (alongside the existing
  canonical / preload / OG tags), using each generated `.src` as the `href`.
- Place them near the other identity/meta tags; order is not significant.

**Technical design** *(directional guidance for review, not implementation
specification — the implementing agent should treat it as context, not code to
reproduce):*

```astro
---
import { getImage } from "astro:assets";
import portrait from "../assets/portrait-illustrated.jpg"; // already imported

const favicon = await getImage({ src: portrait, width: 32, height: 32, format: "png" });
const touchIcon = await getImage({ src: portrait, width: 180, height: 180, format: "png" });
---
<head>
  <!-- ...existing meta/canonical/preload... -->
  <link rel="icon" type="image/png" sizes="32x32" href={favicon.src} />
  <link rel="apple-touch-icon" href={touchIcon.src} />
</head>
```

**Patterns to follow:**
- The portrait is already consumed via `astro:assets` in this same file (the
  `<Image>` "chrome-badge") and in `src/pages/index.astro` (the hero
  `<Image>`) — mirror that asset-import convention; `getImage` is the
  no-`<img>` sibling of `<Image>` for cases that need just the URL.

**Test scenarios:** covered by U2 (favicon links present and resolvable). No
standalone behavioural logic lives in this unit beyond emitting the tags.

**Verification:**
- `pnpm build` completes and the two optimised PNGs are emitted (the icon href
  points at an Astro-generated asset path). A build failure here would catch a
  bad `getImage` call — the plan's real smoke test for the mechanism.
- `pnpm dev`, open any page: the illustrated portrait shows in the browser tab
  next to the title. Confirm on both a light and a dark tab bar (the portrait
  should read on either — no masking needed).

### U2. Assert the favicon in the SEO head test

**Goal:** Lock in that the tab icon and touch icon are present and actually
resolve, so a future head refactor can't silently drop them.

**Requirements:** Regression guard for U1.

**Dependencies:** U1.

**Files:**
- `tests/visual/seo.spec.ts` — extend this existing Playwright head-assertion
  suite (it already asserts `<title>`, description, OG, Twitter, JSON-LD,
  robots per route).

**Approach:**
- The icon links come from `BaseLayout.astro`, so they are identical on every
  route. Add **one dedicated test** (visit `/`) rather than looping per route —
  the shared-shell source means one route proves them all, and per-route
  duplication would add noise for no coverage gain.
- Read the icon `href` from the DOM and issue a `request.get` against it to
  assert it resolves — env-agnostic, since it tests whatever URL the pipeline
  emitted (dev image endpoint or built `/_astro/*.png`).

**Test scenarios:**
- **Happy path — favicon present:** `/` head contains a `link[rel~="icon"]`
  with a non-empty `href` and `type="image/png"`.
- **Happy path — favicon resolves:** a GET of that `href` returns HTTP 200 with
  a PNG content-type (proves the generated asset exists, not just that a tag was
  written).
- **Happy path — apple-touch-icon present + resolves:** head contains a
  `link[rel="apple-touch-icon"]` whose `href` GETs 200.
- **(Optional) Derived-from-pipeline sanity:** the icon `href` matches an
  Astro-optimised asset path (e.g. contains `/_astro/` or `/_image`),
  confirming it comes from the portrait pipeline rather than a stray static
  file. Soft assertion — drop if it proves brittle across dev/build.

**Verification:**
- `pnpm test:visual` passes, including the new favicon assertions.
- `pnpm verify:all` (Biome + tsc + Vitest + Playwright + Lighthouse/axe) is
  green before opening the PR, per repo merge workflow.

---

## Risks & Notes

- **`/favicon.ico` root probe 404s.** With the pipeline approach there is no
  literal root `/favicon.ico`. Modern browsers use the `<link rel="icon">` and
  render the tab icon fine; only legacy clients that hard-probe the root are
  affected. Mitigation is the deferred static-fallback item above — add only if
  a real client is observed missing the icon.
- **Legibility at 16–32px.** An illustrated portrait can read as busy at tab
  scale. This is the user's explicit ask (the photo, shrunk down). If it looks
  muddy in practice, the deferred tab-optimised-crop item covers swapping the
  source — no structural change.
- **Head-only change, no visual-regression impact.** Favicons don't appear in
  page-body screenshots, so the Playwright visual baselines are unaffected — no
  baseline re-capture needed. The new coverage is the `seo.spec.ts` assertions,
  not a screenshot.
- **File ownership.** `src/layouts/BaseLayout.astro` and `tests/` are both
  editable in a normal single-owner flow; no orchestrator-only config
  (`astro.config`, `package.json`, etc.) is touched. `sharp` is already
  installed — no dependency change.
