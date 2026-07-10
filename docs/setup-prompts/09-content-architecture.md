# Prompt 9 — Content architecture (MVP-narrowed)

**Phase:** 3 (Content and design)
**Depends on:** Prompt 8 complete (DESIGN.md exists with sitemap + MVP scope overlay)
**Revised:** 2026-04-19 per `/office-hours` doc (`~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260419-145932.md`). Launch scope is now 2 live pages (`/`, `/colophon`) + `/off-trail` catchall. No seeded blog or project content at MVP. The `trail-register` data source is new.
**Expected outcome:** Keystatic `posts` schema is documented as-is (already scaffolded in Prompt 3), no new content entries seeded, `src/content/trail-register/` data source is wired so `TrailheadKiosk.TrailRegisterRail` has something to render at launch, `src/pages/blog/` is removed or gated.

---

## Paste into Claude Code

```
Revise the content layer for the MVP-narrowed launch. Do NOT re-scaffold
Keystatic — the `posts` collection already shipped in Prompt 3. Instead:

1. Keystatic posts collection — leave the schema as-is. Do NOT seed any new
   `src/content/posts/*/` entries. The single seed post from Prompt 3 stays
   as a format reference; it will not be linked from any live page at
   launch. Content-seeding is a post-launch task.

2. Colophon content — ships as MDX at `src/pages/colophon.astro`, authored
   by the `content-writer` subagent. Do NOT route this through Keystatic;
   the bio pulls from `identity/` in the parent repo (values, strengths,
   personality, voice guide, influences). The page renders: bio blurb +
   influences list + tools/stack + contact line
   (`mailto:hello@korabeland.com`).

3. Trail-register data source — new content type, used by the
   TrailRegisterRail left rail of TrailheadKiosk. The orchestrator must:

   a. Add `scripts/gen-trail-register.ts` as a prebuild hook. It runs
      `git log -n 14 --format=%H%x1f%s%x1f%an%x1f%aI` and writes 14 most-
      recent commits to `src/content/trail-register/commits.json`. On
      shallow-clone / missing git history (Vercel builds without
      `fetchDepth: 0`), it falls back to
      `src/content/trail-register/commits.seed.json`.
   b. Add `commits.json` to `.gitignore` (per-build churn).
   c. Commit `commits.seed.json` as a 14-entry placeholder (use real
      earlier commits from this repo as the seed payload).
   d. Wire `prebuild` in `package.json` scripts so `pnpm build` and
      `pnpm dev` both run the generator.
   e. Decide whether `trail-register` lives as an Astro content collection
      (requires a `src/content.config.ts` entry with a schema) or as a
      plain `src/data/` import. Pick one and update the TrailRegisterRail
      component spec to match before Prompt 10 runs.

4. `src/pages/blog/` — remove the directory (or keep it only as a 410/404
   guard). `/blog/<slug>` is not a launch route. The Keystatic `posts`
   collection schema stays defined so post-launch content-seeding can pick
   it up later.

5. Verify Keystatic admin still works at `/keystatic` (dev only — the
   launch checklist from Prompt 13 will confirm prod visibility).

Commit as "feat: content architecture for 2-page MVP launch".
```

---

## What makes this different from typical Keystatic setups

- **No seeded content at MVP.** The launch is two polished pages plus a kiosk hero — seeding would be noise.
- **Colophon is MDX, not Keystatic.** The colophon is too specific to Korab's voice to route through a CMS schema, and it reads from `identity/` in the parent repo.
- **`trail-register` is build-time generated, not editable.** It's a record of this repo's own commit history, rendered as pencil ticks on the left rail. v1.1 weathering will extend it to deploy marks; not at launch.

## What to watch for

- `scripts/gen-trail-register.ts` runs cleanly on both a full clone and a shallow clone (simulate with `git clone --depth 1`). Fallback path must be exercised in CI.
- `commits.seed.json` is committed; `commits.json` is gitignored. If both end up tracked, the build will race between seed and generator.
- Keystatic admin at `/keystatic` still renders in dev mode.
- `src/pages/blog/` removal does not break `pnpm verify` (no stale imports).
- `content-writer` subagent only creates `src/pages/colophon.astro`. It does not touch `src/content/posts/` or `keystatic.config.ts`.

## Red flags to push back on

- Seeding sample blog or project entries "just to have something." Scope narrowing is the whole point.
- Routing colophon through Keystatic. Too rigid for a single page pulling from `identity/`.
- Generating `commits.json` into the tracked tree. It must be gitignored.
- Skipping the seed fallback — Vercel's default shallow clone will break the build without it.
- Deleting the Keystatic `posts` schema. Keep the schema, don't seed entries.

## Quick test

1. `pnpm dev` → `curl -sS localhost:4321/colophon` returns HTML with the bio line from `identity/`.
2. `pnpm build` runs `scripts/gen-trail-register.ts` in its `prebuild` step; `dist/_astro/` contains the rendered TrailRegisterRail with real SHAs (not seed placeholders) when run on a full clone.
3. `git clone --depth 1 . /tmp/shallow && cd /tmp/shallow && pnpm build` produces a working build where the rail renders seed entries.
4. `/keystatic` loads in dev mode.

If any of those four break, fix before Prompt 10.
