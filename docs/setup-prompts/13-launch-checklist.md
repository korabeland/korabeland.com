# Prompt 13 — Launch checklist (MVP-narrowed)

**Phase:** 4 (Polish, deployment, review loop)
**Depends on:** Prompt 12 complete (polish passes done on the 3 live routes).
**Revised:** 2026-04-19 per `/office-hours` doc — narrowed to 3 live routes, adds MapSurface audit-gate artifact + `/_dev/kiosk` prod-404 + trail-register generator verification, drops contact-form / RSS / per-post OG / analytics checks.
**Expected outcome:** A single launch-readiness report with the items below green. Green across the board means you ship.

---

## Paste into Claude Code

```
Run the pre-launch checklist. Produce a single markdown report in
docs/launch-readiness.md checking:

 1. pnpm verify:all passes on main branch (Biome + tsc + Vitest +
    Playwright visual + Lighthouse + axe).
 2. Lighthouse scores ≥ 0.90 performance, ≥ 0.95 accessibility on each of
    the 3 live routes: /, /colophon, /off-trail.
 3. Zero critical/serious axe violations on the 3 live routes.
 4. All 3 live routes return 200 and render correctly at 375 / 768 /
    1280 / 1920 (screenshot evidence in the PR-description gallery).
 5. /404 returns 404 with the 404 component rendered.
 6. /off-trail?from=notes, ?from=projects, ?from=work-with-me each render
    the matching destination label.
 7. /_dev/kiosk returns 404 in production (hit the preview URL with PROD
    set and confirm the guard fires). Pre-prod dev server still serves
    it.
 8. robots.txt disallows /_dev/*. Sitemap.xml excludes /_dev/*. Both
    assertions automated via Playwright.
 9. Meta tags populated on the 3 live routes (Playwright assertions on
    <title>, meta description, OpenGraph).
10. OG image for / renders at 1200×630 and passes Twitter/Facebook card
    validators.
11. Mirror-sheen audit artifact committed at
    docs/reviews/<date>-mapsurface-audit.md with all 10 checklist items
    marked PASS (from Prompt 10 step 4).
12. scripts/gen-trail-register.ts ran on the Vercel build. Rendered
    TrailRegisterRail on / shows short-SHAs from this repo's actual git
    history, not the placeholder SHAs from commits.seed.json. If the
    seed shows through on a production build, either widen Vercel's git
    fetch depth or accept the seed fallback and document why.
13. Keystatic admin at /keystatic works in production OR is gated
    appropriately. Decide and document which.
14. Custom domain korabeland.com pointed at Vercel. TLS cert issued.
    Both apex and www resolve.
15. Environment variables set in Vercel (no missing vars). No
    ANTHROPIC_API_KEY anywhere in project env or CI secrets.
16. Usage summary: Max weekly allocation consumed during the build
    (Opus/Sonnet/Haiku breakdown from `/usage-status`). Flag phases that
    concentrated the most spend so we can push more work to local Qwen
    on the next build.

Any red item blocks launch. Green items across the board means I get a
single "Ready to ship" message with the production URL.

Commit as "docs: launch readiness report".
```

---

## How to read the report

The reviewer subagent produces a single markdown table with three columns: Check / Status / Evidence. Each row links to the specific test output, screenshot, config file, or audit artifact proving the check passed. For red items, it links to a follow-up task you can dispatch to fix.

## What to watch for

- "Green" items must have real evidence — a screenshot, a test log, a config value, a committed audit file. Not just "reviewer says it passes."
- Item #7 (`/_dev/kiosk` prod-404) is easy to get wrong if the `import.meta.env.PROD` guard uses the wrong condition. Hit the Vercel preview URL directly and confirm the 404 response code — don't rely on absence-of-link.
- Item #11 (mirror-sheen artifact) is the single most important gate. If that file is missing, the build order from Prompt 10 wasn't followed.
- Item #12 (trail-register on Vercel) — Vercel defaults to a shallow clone. If the register shows seed SHAs in production, the kiosk's "field log" premise is undermined. Either fix the fetch depth or accept the degraded state with an explicit note in the launch report.
- Item #13 (Keystatic in prod) is a security question: either gate it behind auth, make the admin dev-only, or accept that anyone can edit content. Decide and document.
- Item #14 (custom domain) requires the domain to be registered and DNS-ready. Have it set up before running this prompt.

## Red flags to push back on

- Passing items without evidence ("trust me" is not green).
- Route-200 checks including `/blog/<slug>`, `/projects/<slug>`, `/work-with-me` or any other deferred route — those aren't launch routes.
- `/_dev/kiosk` being reachable in production — critical fail.
- Contact form / analytics / RSS feed checks asking to be marked "not yet implemented" — remove them entirely, they're deferred by design.
- Missing the mirror-sheen audit artifact or the trail-register generator verification — those two items are what make the MVP feel like the object rather than a scaffold.
- Usage summary that doesn't actually show per-phase breakdown.

## The ship decision

If all 16 items are green, paste one more message to Claude Code:

```
Ship it. Promote the current main branch to production on korabeland.com.
Verify the production site is live and functioning. Post the production
URL as a final confirmation.
```

Then you're done with v1. The ongoing operation mode from Prompt 14 takes over, and the v1.1 weathering milestone can be scheduled.
