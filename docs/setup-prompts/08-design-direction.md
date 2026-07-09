# Prompt 8 — Design direction from inspiration

**Phase:** 3 (Content and design)
**Depends on:** Prompts 1–7 complete. You have 3–5 inspiration URLs and a vibe description ready.
**Expected outcome:** DESIGN.md with a complete design spec (mood, tokens, type, spacing, components, sitemap, motion) and `src/styles/tokens.css` with real CSS custom properties. No components built yet — this is the spec phase.

---

## Before you paste: gather your inputs

You need these ready to paste into the prompt:

1. **3–5 URLs** of websites you love (full URLs, not just "Apple's website")
2. **Screenshots or Figma links** (optional but helpful — paste as attachments or URLs)
3. **A 2–3 sentence vibe description** — be specific about feel, not just aesthetic. Examples:
   - "editorial magazine feel with generous whitespace, serif display type, muted earth palette, subtle animations on scroll"
   - "brutalist portfolio with hard edges, mono type, high contrast black-on-white, quick crossfade transitions"
   - "warm personal site, handwritten touches, soft pastels, slow breathing animations, reading-first hierarchy"

## Paste into Claude Code

```
Invoke the design-director subagent. I'm providing inspiration:

[PASTE 3–5 URLs OF WEBSITES YOU LIKE]
[PASTE ANY SCREENSHOTS OR FIGMA LINKS]
[DESCRIBE THE VIBE IN 2–3 SENTENCES — e.g., "editorial magazine feel with
generous whitespace, serif display type, muted earth palette, subtle
animations on scroll"]

Produce DESIGN.md containing:
1. Mood summary (2 paragraphs)
2. Color tokens (primary, secondary, accent, neutral scale, semantic colors)
   with both hex and OKLCH values, and WCAG contrast matrix
3. Typography scale (display, h1-h6, body, small, caption) with font families,
   sizes, line heights, letter spacing
4. Spacing scale aligned to Tailwind defaults where possible
5. Component inventory — list every component this site will need (Header,
   Hero, BlogCard, Footer, etc.) with a one-line purpose each
6. Sitemap — routes and their content type
7. Motion principles — easing curves, duration ranges, what animates

Also create src/styles/tokens.css with the actual CSS custom properties
and update tailwind.config.ts to consume them.

Do NOT build any components yet. This is the spec.
```

---

## What to watch for

- WCAG contrast matrix should show every foreground/background combo with pass/fail for AA and AAA — not just "looks fine"
- OKLCH values let you do perceptually uniform color interpolation; if Claude Code only gives hex, push back
- Component inventory should be exhaustive — if it lists 8 components when you know you need 20, the design phase is incomplete
- Sitemap should include all routes you foresee (home, blog index, blog post, project index, project post, about, contact, 404, keystatic admin)

## Red flags to push back on

- Claude Code proposes a design without reading the inspiration URLs (via WebFetch tool)
- Color tokens that fail WCAG AA contrast for body text
- Font stack with zero fallbacks — always include system font fallbacks
- Motion principles that say "smooth transitions" without specifying duration ranges and easing curves

## Iteration tip

If the first DESIGN.md isn't right, don't abandon it — respond with specific changes: "The primary color is too saturated, push toward slate. Body type is too small — bump to 18px base. Add more whitespace between hero and first section." Treat it like art direction.

---

**Revised 2026-04-19** — DESIGN.md shipped 2026-04-18 (korabeland.com, OKLCH palette, Fraunces / Inter Tight / JetBrains Mono type scale, full component inventory). An MVP-scope overlay was applied 2026-04-19 per the `/office-hours` doc at `~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260419-145932.md`: the sitemap now flags `/` + `/colophon` + `/off-trail` as LIVE, adds `MapSurface.astro` / `TrailRegisterRail.astro` / `PopularRoutesRail.astro` primitives, and defers `/notes`, `/projects`, `/work-with-me` pages to post-launch. Future design changes go through `design-director` as before — this prompt is historical; treat the shipped DESIGN.md as ground truth.
