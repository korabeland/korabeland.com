# Prompt 12 — SEO, performance, accessibility pass (MVP-narrowed)

**Phase:** 4 (Polish, deployment, review loop)
**Depends on:** Prompt 11 complete (preview infrastructure working).
**Revised:** 2026-04-19 per `/office-hours` doc — narrowed to the 3 live routes and drops the alt-text pass since MVP has no images.
**Expected outcome:** `/`, `/colophon`, and `/off-trail` each have complete meta tags, WCAG AA compliance, Lighthouse ≥ 0.9 performance, and a single Open Graph image for `/`. Four review cycles (no alt-text pass at launch).

---

## Paste into Claude Code

```
Run the polish pass for the 3 live MVP routes: /, /colophon, /off-trail.
Do NOT shoot or score deferred routes — they are unlinked at launch.
Dispatch specialized local-delegated tasks:

1. SEO metadata — content-writer generates meta titles, descriptions,
   OpenGraph tags, Twitter cards, and JSON-LD schema for the 3 live
   routes ONLY (home, colophon, off-trail). Validated by Playwright
   assertions on rendered <head>.

2. [SKIPPED AT LAUNCH] Alt text pass — MVP has no images (Figure
   placeholders are diagonal-hatch SVGs rendered via CSS). Re-enable
   this pass when real image assets ship post-launch.

3. Performance budget — reviewer runs Lighthouse CI on the 3 live
   routes. Any route scoring below 0.9 performance gets a follow-up task
   to the ui-builder to investigate (escalate to cloud if local cannot
   resolve). Typical fixes: font preloading, SVG inline sizing, and for
   /, confirm MapSurface's rough.js SVG stays under the 20 KB HTML delta
   budget from Prompt 10 step 4.

4. Accessibility pass — @axe-core/playwright across the 3 live routes.
   Zero critical or serious violations is the gate. Minor violations get
   logged but don't block. Specifically verify:
     - MapSurface trail pins have both SVG-level <a> wrappers AND
       duplicate screen-reader anchors elsewhere on the page (per
       DESIGN.md a11y spec).
     - MapSurface's breathe/radar-ping motion is gated behind
       @media (prefers-reduced-motion: reduce).
     - AvailabilityCard / SlotsIndicator focus ring specs don't apply
       (those surfaces aren't live at MVP).

5. Open Graph images — generate ONE static OG image for / (the
   TrailheadKiosk hero) using Satori or @vercel/og at 1200x630. Do NOT
   generate per-post OG images — there are no posts at launch.

After each, generate a review page and wait for my approval before the
next.

Commit each pass separately.
```

---

## Why sequential, not parallel

Each pass changes site-wide content in ways that affect later passes:
- SEO metadata changes `<head>` which changes Lighthouse scores (fonts preloaded, meta tags render)
- Performance fixes might change OG image generation paths

Running sequentially (with a review gate between each) gives you clean cause-and-effect. Parallel execution produces commits that can't be individually validated.

## What to watch for

- **SEO pass**: 3 routes only. Titles unique per route (`korabeland.com — trailhead`, `korabeland.com — colophon`, `korabeland.com — off-trail`). Under 60 chars. Descriptions under 155 chars.
- **Alt-text pass is intentionally skipped at launch.** MVP ships with zero bitmap images; diagonal-hatch `Figure` placeholders are CSS gradients. Re-enable the pass the moment real image content ships (post-launch).
- **Performance pass**: Lighthouse can be flaky; use multiple runs (≥3) and take median. CLS issues often come from web fonts — verify `font-display: swap` and preloading. `/` is the highest-risk route because of MapSurface SVG — confirm no client-JS chunk was introduced (cross-check Prompt 10 step 4 bundle budget).
- **Accessibility pass**: Zero critical/serious is the gate. "Minor" issues (e.g., landmark roles) are logged for later. Pay special attention to MapSurface trail pins and the reduced-motion media query.
- **OG image**: One image only (`/`). Test with Twitter's card validator and Facebook's sharing debugger before considering this done.

## Red flags to push back on

- Parallel dispatch of all four passes — this breaks the review gate structure
- SEO metadata stuffed with keywords or template-looking
- Running an alt-text pass when there are no real images — it's noise until real assets ship
- Accepting Lighthouse < 0.9 "because of MapSurface SVG" — that's when you diagnose whether a stray client chunk slipped in, not lower the bar
- OG images without testing the actual rendered output
- Generating per-route OG images (there's no blog/project content at launch; one hero OG for `/` is enough)
- Shooting Lighthouse against `/notes` or `/projects` — those aren't live routes at MVP

## Usage check

After this prompt, run `/usage-status`. The polish pass should barely move the needle on your Max weekly allocation because most work (alt text, SEO copy, image optimization suggestions) delegates to local Qwen3.6 and the rest goes through Haiku. If Sonnet or Opus usage jumped noticeably, check whether the pruner is actually being invoked on escalations — that's the usual culprit.
