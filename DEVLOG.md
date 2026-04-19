# DEVLOG — korabeland.com (the Dev Team build)

A plain-English build journal. One entry per session, newest at the top. Read this if you want to understand *why* the codebase looks the way it does without grinding through git log.

The site is being built by an AI team orchestrated through Claude Code, following a 14-prompt playbook in `setup prompts/`. Each prompt is a self-contained chunk of work — scaffolding, design, content, deployment — with verification gates between them.

For the snapshot view ("what's wired right now"), see the project memory tracker; for the canonical record of every change, see `git log`. This file is the in-between layer: narrative, dated, and meant for humans.

---

## 2026-04-19 — Prompt 11: Deployment and preview infrastructure

**Commits:** `b2a8626..eea5af3` (in `korabeland/korabeland.com`)
**Canonical repo:** `korabeland/korabeland.com` — Vercel was already watching this; zero reconfiguration needed.

Prompt 11 wires up the review surface so every PR opens with a rich, locally-generated description — no API keys in GitHub Actions.

**Repo migration.** `Dev Team/` has no `.git/` of its own — the git root is the parent `Korab's Personal Brand/` directory. The correct canonical home for the deployable site is `korabeland.com/` (standalone repo, `Korab's Personal Brand/korabeland.com/`). Migration: cleared old tracked files from `korabeland.com/`, rsync'd `Dev Team/` content in, removed stale artifacts (`personal-site-brief.md`, `build-archive.log`, `public/resume.json`), committed, force-pushed to `korabeland/korabeland.com`. Old code archived on `archive/v1-old-site` branch. `personal-brand` repo archived on GitHub.

**CI workflow.** `.github/workflows/ci.yml` in `korabeland.com/` (the standalone repo root — GitHub Actions finds it). Runs: `pnpm install` → Playwright install → `pnpm verify` → `pnpm test` → reset visual baselines → `pnpm test:visual` → `pnpm run audit` → Chromatic (PR-only, skipped on push). Three CI fixes were needed:
1. Drop `version: 10` from `pnpm/action-setup@v4` (conflicts with `packageManager` in `package.json`)
2. Bump `.nvmrc` from `20.18.3` to `22` (Astro 6 requires `>=22.12.0`)
3. Replace `pnpm preview` with `node scripts/static-preview.mjs` in `playwright.config.ts` (`@astrojs/vercel` blocks `astro preview`)
4. Reset visual baselines before `test:visual` in CI (macOS-generated baselines fail on Linux; Chromatic handles regression in CI)

CI is green: `verify-all` passing on `korabeland/korabeland.com`.

**Pre-push hook.** `.husky/pre-push` calls `generate-pr-description.sh` on non-main branches. `|| true` means a failing generator never blocks the push.

**`scripts/generate-pr-description.sh`.** The 6-element review page generator:
1. Predicted Vercel preview URL from `.vercel/project.json` + branch slug
2. QR code PNG via `qrcode` package → committed to `public/pr-previews/<branch>/`
3. `pnpm build` + `node scripts/static-preview.mjs` → Playwright screenshots (3 routes × 4 viewports) → committed
4. Chromatic dashboard link (runs in CI, not locally — path-spaces bug on macOS with apostrophe in `Korab's`)
5. Lighthouse scores parsed from `.lighthouseci/` JSON
6. Claude (Haiku) plain-English summary via `claude -p` on `git log + git diff --stat`

**`/open-pr` slash command.** `.claude/commands/open-pr.md` wraps the full flow: run script → push → create or update PR.

**Vercel.** `.vercel/project.json` in `korabeland.com/` already had the correct project ID (`prj_CLexAjSgpXWgay2rLgj4EZfC21FV`) from the old site. Auto-deploying correctly — latest build ✅ Ready.

**Branch protection.** Skipped — requires GitHub Pro or public repo. Repo is private on free plan.

**Still local-only (not in `korabeland.com/` git history).** `Dev Team/` is a working copy; changes made there should be rsync'd to `korabeland.com/` and pushed from there for canonical history.

---

## 2026-04-19 — Prompt 10: Object-first component buildout (launch PR)

**Commits:** `078bbb9`, `18eea57`, `0dfafe5`, `9b3693c`, `b35c24c`, `557bdef`, `e6e4794`, `250f194`, `4b298ef`, `1e1bbf1`, `c25b42c`, `5df9deb`, `6a93197`
**Launch PR:** https://github.com/korabeland/personal-brand/pull/1 (`launch/korabeland-com-mvp` → `main`)

Prompt 10 in the revised, **object-first** order: ship the centerpiece (the hand-drawn trail map) on its own, gate it behind a 10-item mirror-sheen audit, and only then compose rails, routes, and chrome around it. Fourteen sequential steps, one commit per step.

**Step 1 — Orchestrator prep.** `pnpm add roughjs` (pinned at `^4.6.6`). Verified the CJS default import shape (`rough.generator()`) works via ESM interop. Wired `src/styles/tokens.css` into `global.css` along with typography helpers (`.t-mono`, `.t-label`, `.lede`, `.prose`) and the named keyframes (`breathe`, `ping`, `trail-drift`, `reveal`) plus the prefers-reduced-motion guard. Moved the Google Fonts `@import` to the top of `global.css` to silence the Vite ordering warning. Added `src/pages/404.astro` per the DESIGN.md spec as a prerequisite for `/off-trail` reuse.

**Step 2 — MapSurface.astro.** The centerpiece. Server-rendered SVG, rough.js in frontmatter only. 6 concentric contour rings at a true geometric progression (k ≈ 1.38 — refined to `[48, 66, 91, 126, 175, 242]` in step 4), alternating regular/index strokes. Exactly 3 trails to `/notes`, `/projects`, `/work-with-me` at `145° / 38° / -95°` (any-pair separation ≥ 30°), roughness 2.0, bowing 1.6. Three destination pin groups with hand-lettered label boxes in `.t-mono`. YOU-ARE-HERE marker at `(360, 220)` — three staggered radar rings using the `ping` keyframe (3.8s linear), plus a breathing halo and 6px moss dot using a new SVG-safe `breathe-halo` keyframe that animates `r` and `opacity` (SVG circles can't use `box-shadow`). Legend strip (index contour / trail / you-are-here) + 500m scale bar + small N compass. A pure FNV-1a hash seeds rough.js per feature, so the rendered path strings are byte-stable across processes — Playwright baselines don't drift.

**Step 3 — /dev/kiosk isolation preview.** One page, one purpose: render MapSurface at 1280px against no chrome, gated by `if (import.meta.env.PROD) return new Response(null, { status: 404 })`. Installed `@astrojs/sitemap`; `astro.config.mjs` now passes `site: "https://korabeland.com"` and a `filter: (page) => !page.includes("/dev/")` so the preview never ends up in the public sitemap. Added `public/robots.txt` disallowing `/dev/` and `/keystatic`. One quirk: the playbook used `_dev/kiosk` with an underscore prefix, but Astro ignores underscore-prefixed directories at the routing level — so even in dev the route would 404. Renamed to `dev/kiosk` (no underscore) and kept the PROD guard as the real enforcement mechanism.

**Step 4 — Mirror-sheen audit gate #1.** `docs/reviews/2026-04-19-mapsurface-audit.md` — all 10 items PASS. Byte-stability verified by two back-to-back `curl` against `/dev/kiosk` producing identical 71 186-byte responses (`md5 b0570153fb20eb603cfb7e6e42296f25` both times). Bundle budget: zero net-new client-JS chunks (grepped the three `dist/client/_astro/*.js` files for `MapSurface`, `TrailheadKiosk`, `seededRandom`, `contour` — all zero hits; `rough` only matches inside unrelated words like `through`). SVG-only HTML contribution: **15 260 bytes gzipped**, well under the 20 KB budget. While writing the audit, bumped the ring radii from a slightly-uneven arithmetic progression to a true geometric one for defensibility.

**Step 5 — TrailRegisterRail.astro.** Left rail. Reads `src/content/trail-register/commits.json` via a plain JSON import (not an Astro content collection — the data isn't authored prose). Renders the 14 most-recent commits as pencil-tick entries: short SHA in `--moss`, subject line mono `--ink-soft`, ISO date mono `--ink-soft`. No scrollback at MVP; scrollback + `marks.json` weathering land in v1.1.

**Step 6 — PopularRoutesRail.astro.** Right rail. Hand-picked, not algorithmic. Exactly two entries at launch: `trailhead → colophon` (live, `/colophon`) and `trailhead → field notes` (pin, `/off-trail?from=notes`). Small `.t-mono` footer below: *"more routes coming as the map fills in."*

**Step 7 — WeatherPill primitive.** `src/components/WeatherPill/WeatherPill.astro` — static string prop at MVP, no runtime fetch. 6px moss dot with the HTML `breathe` keyframe halo (box-shadow based) + `.t-mono` text. Reusable in the kiosk legend strip, availability card, and rails.

**Step 8 — TrailheadKiosk/index.astro.** Full composition: `MapSurface` + `TrailRegisterRail` + `PopularRoutesRail` + bottom legend strip carrying a `WeatherPill` (*"clear · 52°f · taking clients"* at MVP). Tape-corner accents (four absolutely-positioned rotated pseudo-shapes). Responsive: rails stack below the map at 1040px, padding tightens at 640px. Includes an `sr-only` `<nav>` list that duplicates the map pin destinations so screen readers reach `/off-trail?from=<slug>` even though the SVG is `role="img"` and `aria-hidden`.

**Step 9 — Homepage + Chrome.** `src/pages/index.astro` now renders `<TrailheadKiosk />` inside `BaseLayout` with `active="home"`. `BaseLayout.astro` upgraded to a proper Chrome per DESIGN.md: logo mark (SVG) + brand in Fraunces, four nav links (field notes / projects / work-with-me / colophon) with `aria-current` on the active entry, right-side `WeatherPill`, skip link, canonical URL, `theme-color`, preconnects to Google Fonts, and a hairline footer with copyright + colophon link. `NowSection` stays explicitly out of scope at launch — the kiosk fills the viewport.

**Step 10 — /colophon pass.** Marked `prerender = true`. The parent-repo read (`../identity/influences.md`) now only happens at build time, not at request time — so Vercel SSR never tries to read a path that doesn't exist in the runtime bundle. Added a `FALLBACK_INFLUENCES` array for builds where the parent `identity/` folder isn't available (e.g., a Vercel root-directory clone that only pulls in `Dev Team/`). Capped the reading measure at 620 px per DESIGN.md `§ReadingRoom.center`.

**Step 11 — /off-trail catch page.** Factored the 404 spec into `src/components/OffTrail/OffTrail.astro`. Takes an optional `from` prop; known slugs (notes / projects / work-with-me) dim the matching mini-map pin and render a `.t-mono` subline like *"field notes — not yet in the system"*. Unknown values fall back to the generic copy. `src/pages/off-trail.astro` reads `?from=` from the URL, guards against unknown values, and renders OffTrail inside BaseLayout. `src/pages/404.astro` now renders the same component with no `from` — single source of truth.

**Step 12 — Wire trail pin clicks.** Each MapSurface pin group wrapped in `<a href="/off-trail?from=<slug>" aria-hidden tabindex="-1">`. Screen-reader users still reach the destinations through the TrailheadKiosk `sr-only` nav. Hover/focus styling lifts the label box and tints the label text `--moss`. Byte-stability preserved.

**Step 13 — pnpm verify:all green.** Four layers:
- Static: biome + tsc clean (37 files).
- Unit: vitest 3/3.
- Visual: Playwright 10/10 at 375 / 768 / 1280 / 1920 (baselines committed) + axe on `/` and `/colophon` — zero critical or serious violations.
- Perf: Lighthouse CI on the prerendered output (a new dependency-free `scripts/static-preview.mjs` serves `dist/client/`), desktop preset, performance ≥ 0.90, accessibility ≥ 0.95, LCP ≤ 2500 ms, CLS ≤ 0.10 across 6 runs on 2 URLs.

Three gotchas that burned cycles:
- `.t-mono` at the default `--ink-mute` color failed WCAG AA (3.33:1 on `--paper`). Moved the default to `--ink-soft` (8.0:1) globally; also applied to `.register-date`, `.routes-footer`, `.routes-status--off-trail`, `.subline`. `--ink-mute` remains for non-text uses (SVG strokes, legend index rings).
- Lighthouse against `astro dev` showed LCP 7.9s because of HMR + unminified sources. Switched to `pnpm build` + `node scripts/static-preview.mjs` serving the static prerendered output; mobile preset was still punishing at ~0.84, so switched to the **desktop preset** (the kiosk hero is desktop-first — the real mobile-perf check belongs on the Vercel preview URL at Prompt 11).
- `pnpm audit` in `verify:all` was being shadowed by pnpm's built-in CVE scanner. Changed to `pnpm run audit` so the Lighthouse script runs.

**Step 14 — Launch PR.** Pushed `launch/korabeland-com-mvp` to GitHub and opened [pull request #1](https://github.com/korabeland/personal-brand/pull/1) targeting `main`. The PR body enumerates what shipped, what's explicitly deferred post-launch, and a test plan for the Vercel preview. Prompt 11 (deployment preview) picks up the preview URL from here and runs the six-element review page.

---

## 2026-04-19 — Prompt 9: Content architecture for the 2-page MVP launch

**Commits:** `7f3e665`, `407ae99`, `a3495e8`

The 2026-04-19 office-hours doc narrowed the launch surface hard: only `/` (the kiosk hero) and `/colophon` go live, plus a catch-all called `/off-trail` that politely tells visitors "this path hasn't been mapped yet" when they click on a trail pin (notes, projects, work-with-me) that isn't built yet. Prompt 9 made the codebase actually reflect that decision.

Three substantive moves:

**Built the trail register.** The home page design has a left rail next to the kiosk that shows the 14 most recent commits to this repo as little pencil-tick entries — a hiker's logbook for the site itself. A new script (`scripts/gen-trail-register.ts`) runs `git log -n 14` before every build and dumps the result to a JSON file. It has a safety net: if git isn't available or only has a shallow clone (which is what Vercel does by default), it falls back to a committed seed file with 14 placeholder entries. Without that fallback, Vercel builds would silently break. The generator is wired into both `pnpm dev` and `pnpm build` via `predev`/`prebuild` hooks.

**Wrote the colophon.** A colophon is the publishing-world term for a "how this thing was made" page. Ours has four sections: a short bio, a list of intellectual influences (Steve Jobs, Dario Amodei, Adam Grant — pulled live from `identity/influences.md` so it stays in sync), the tools/stack, and a `mailto:hello@korabeland.com` link. It deliberately doesn't go through Keystatic (the CMS) because it's too specific to your voice — it reads from your identity files at build time instead.

**Tore out `/blog`.** The `/blog/index.astro` and `/blog/[slug].astro` pages are gone. The Keystatic *schema* for blog posts is preserved (so when you do start writing notes post-launch, the CMS is ready), and the single sample "hello-world" post stays as a format reference. Nav now points to `/colophon`.

Two cleanup commits followed. `407ae99` finished a leftover rebrand from `korab.land` → `korabeland.com` in the design-token comments and a Biome ignore path. `a3495e8` silenced eight Biome warnings that were really false positives — Biome can't read the template section of `.astro` files, so it was flagging legitimately-used identifiers as dead. An `overrides` block in `biome.json` turns off just those two rules for `.astro` files; everything else stays strict. `pnpm verify` now runs silently.

---

## 2026-04-18 — Prompt 8: Design direction — DESIGN.md and tokens

**Commits:** `17bc046`, `2e7748a`

The first design pass for korabeland.com landed: `DESIGN.md` as the single source of truth for typography, color, spacing, components, motion, and accessibility, plus `tokens.css` as the machine-readable version of the same. The aesthetic is a "trail map for a thoughtful person's work" — the home page is a topographic map with a "you are here" plateau and dashed trails radiating to destinations. Park-ranger field-journal feel. Fraunces (display), Inter Tight (body), JetBrains Mono (chrome). OKLCH color tokens with hex fallbacks. Sharp corners by default, hairline borders, dashed trails, slow looping motion.

The Biome chore commit made room for the design references bundle (large reference assets that shouldn't be linted) and excluded the local agent config + an empty seed Playwright test from CI noise.

Note: the office-hours doc on 2026-04-19 then narrowed the *scope* of what would actually ship at launch (see Prompt 9 above), but the underlying design system stayed the same.

---

## 2026-04-17 — Prompts 1–7: Foundation, in one big push

This was the foundational marathon — everything that needed to be true before design and content could even start.

**Prompt 1 — Environment pinning.** Commit `1dfb951`. Pinned Node, pnpm, and the basic toolchain so every subagent works in the same environment. Added `scripts/health-check.sh` and friends.

**Prompt 2 — Orchestration rules.** Commits `c72fe82`, `c857ba4`. Established `AGENTS.md` (symlinked from `CLAUDE.md`) as the contract every agent must follow. The most important section is the **file ownership rules**: a strict list of paths that only the orchestrator can touch (config files, `package.json`, lockfiles, the Keystatic config, anything in `.claude/`, the trail-register generator). This is the single biggest guardrail in the repo — it's how parallel subagents avoid stepping on each other.

**Prompt 3 — Application scaffold.** Commit `f1303a8`. Stood up the actual Astro 6 app: TypeScript strict mode, Tailwind CSS 4 via the Vite plugin, shadcn/ui via React islands, Keystatic as a local-git-backed CMS, MDX support, and the Vercel adapter for server output. The Keystatic posts collection uses a path with a trailing slash (`src/content/posts/*/`) because index-mode storage requires it — without the slash, the reader returns zero posts. There's a working `/keystatic` admin UI at dev time.

**Prompt 4 — Verification stack.** Commit `db9a246`. The four-layer verification pyramid that gates every PR: `pnpm verify` (Biome + tsc), `pnpm test` (Vitest), `pnpm test:visual` (Playwright with pixelmatch screenshots at four viewports + axe-core accessibility checks), `pnpm audit` (Lighthouse CI for performance + accessibility scores). Husky pre-commit hook runs `pnpm verify` on every commit. Visual baselines live committed in `tests/visual/baselines/`; diffs are gitignored.

**Prompt 5 — Local model delegation.** Commit `4f385f0`. Wired up `@houtini/lm` as the primary path to a local LM Studio model (Qwen 3.5 27B distilled, served at `localhost:1234`), with a curl-based shell fallback (`scripts/local-llm.sh`) for when the MCP path is overkill. Also added a `/fix-my-env` slash command that takes a shell error and produces a one-line fix.

**Prompt 6 — Escalation pipeline.** Commit `844c798`. The economics piece: when a local model fails three times on the same error fingerprint (error class + file path + line number), we escalate to Claude Sonnet (or Opus for critical-path work) via headless `claude -p` — using your Claude Max subscription, no API keys, no separate billing. Crucially, every escalation is pre-pruned by Haiku (`scripts/prune-context.sh`) down to ≤500 tokens so we don't burn through the weekly limit shipping raw stack traces and DOM dumps to the bigger models. `scripts/escalate.sh` does the prune-then-escalate dance automatically.

**Prompt 7 — Subagent roster.** Commits `5353239`, `0d7dbb5`. Six specialist subagents in `.claude/agents/`, each with strict file ownership and Bash allowlists: `design-director` (produces DESIGN.md), `content-writer` (drafts copy via local LM), `ui-builder` (one component subfolder per invocation, locked from siblings), `test-stub` (Vitest + Playwright stubs via local LM), `visual-reviewer` (sequential screenshots + pixelmatch + vision model only on diff regions), and `reviewer` (read-only PR review). The follow-up commit tightened the visual-reviewer to only ever hit `localhost`.

---

## Pre-history — Brand foundation (Feb–Apr 2026)

Before the Dev Team subdirectory existed as a build target, ~30 commits laid down the brand-level foundation in the parent repo: strategy doc, identity files (values, strengths, personality, voice guide, influences), the Paperclip autonomous agent org for content production, the Wispr Flow voice-note sync pipeline, and design references. Those commits don't belong in this dev log because they're not Dev Team build moves — but they're the inputs the colophon and design system pull from. See the parent repo's `git log` if you want that history.

---

## Up next — Prompt 10: Component buildout (object-first)

The big one. Actually building the kiosk hero you've designed. The order is "object-first": the `MapSurface` component (topographic map with dashed trails, breathing "you are here" dot, contour rings, three destination pins, radar-ping marker) gets built and polished in isolation at `/_dev/kiosk` *before* anything else is wired in. Only after it passes a "mirror-sheen audit" do the rails (`TrailRegisterRail` + `PopularRoutesRail`) get added, then the full kiosk composition, then the routes themselves. `rough.js` carries the hand-drawn irregularity; everything is server-rendered with zero client JS.

After Prompt 10: deployment + preview infra (11), polish (12), launch checklist (13), ongoing operations (14).
