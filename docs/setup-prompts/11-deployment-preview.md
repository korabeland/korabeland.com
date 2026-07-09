# Prompt 11 — Deployment and preview infrastructure

**Phase:** 4 (Polish, deployment, review loop)
**Depends on:** Prompt 10 complete (TrailheadKiosk + colophon + off-trail shipped, `pnpm verify:all` passing).
**Revised:** 2026-04-19 per `/office-hours` doc — narrowed to 3 live routes and adds the `prebuild` trail-register hook + `/_dev/*` sitemap/robots exclusion.
**Expected outcome:** Every Git push creates a Vercel preview with a rich review page in the PR comments, the `scripts/gen-trail-register.ts` prebuild hook runs cleanly on Vercel (with seed-fallback on shallow clone), and `/_dev/kiosk` is blocked from prod sitemap + robots.

---

## Pre-flight

Before this prompt, have ready:
- A GitHub repo (this project should already be pushed to one)
- A Vercel account linked to your GitHub
- A Chromatic account (free tier is fine for personal use)

## Paste into Claude Code

```
Set up the review surface I'll actually use.

1. Connect this GitHub repo to Vercel (prompt me with the CLI command if
   needed). Configure automatic preview deployments on every branch/PR.
   - Vercel build command runs `pnpm build`, which must hit the `prebuild`
     script (scripts/gen-trail-register.ts) first. Verify on the first
     preview deploy: the rendered /index HTML contains TrailRegisterRail
     entries with real short-SHAs from this repo's commit history — NOT
     the placeholder SHAs from commits.seed.json. If the seed shows
     through, Vercel is running a shallow clone; set `git.deepFetch` or
     explicitly `git clone --depth 0` in the Vercel project settings
     (or rely on the seed fallback if we accept the degraded state).
   - In astro.config.mjs, pass @astrojs/sitemap
     `filter: (page) => !page.includes("/_dev/")` so /_dev/kiosk never
     lands in the public sitemap.
   - Add `/_dev/*` to robots.txt disallow.
2. Configure Vercel Toolbar for visual comments that sync to GitHub.
3. Set up Chromatic: install, connect to repo, publish Storybook (or the
   /_showcase pages if no Storybook), enable the visual diff queue.
4. Create .github/workflows/ci.yml that runs verify:all on every PR and
   blocks merge on failure. CI does NOT call Claude — that would require
   an API key we don't want. CI only runs deterministic checks (tsc,
   biome, vitest, playwright, lighthouse, axe).

5. Create the review page via a local pre-push hook instead of a GitHub
   Action. This preserves the subscription-native approach (no API keys
   anywhere):

   a. Create .husky/pre-push that runs scripts/generate-pr-description.sh
   b. scripts/generate-pr-description.sh:
      - Uses headless claude -p (model: haiku) to generate the plain-English
        summary from git log and the diff
      - Captures Playwright screenshots at 4 viewports for each of the
        3 live routes: /, /colophon, /off-trail. Post-launch, additional
        routes can be added to the shoot list — do NOT include /_dev/
        routes in the PR screenshot set.
      - Uploads screenshots to /public/pr-previews/<branch>/ (gitignored,
        served by Vercel preview automatically)
      - Runs Lighthouse against the current build
      - Assembles a markdown file at .pr-description.md containing:
        * Large Vercel preview URL with QR code (QR generated via qrcode
          CLI, not a GitHub Action)
        * Screenshot gallery links at 4 viewports
        * Chromatic diff queue link (fetched via Chromatic API)
        * Lighthouse scores summary
        * Plain-English markdown summary (from claude -p)
   c. When I run `gh pr create`, use `--body-file .pr-description.md`
      so the rich review page becomes the PR body
   d. For subsequent pushes to the same PR, update the description with
      `gh pr edit --body-file .pr-description.md`

6. Create .claude/commands/open-pr.md slash command that:
   - Pushes current branch
   - Runs scripts/generate-pr-description.sh
   - Creates or updates the PR via gh CLI
   - Outputs the PR URL

7. Configure branch protection on main: PR required, verify:all must pass,
   at least one approval (mine via thumbs up in Vercel Toolbar or GitHub UI).

The six-element review page lives in the PR description, generated locally
before push, not in CI. This avoids API keys in GitHub Actions entirely.

Commit as "feat: preview and review infrastructure (subscription-native)".
```

---

## Why local generation instead of a GitHub Action

The original plan had CI generate the plain-English summary via an API call. That approach would require:
- An `ANTHROPIC_API_KEY` with credits stored as a GitHub secret
- Separate billing from your Max subscription
- Another failure mode (key expiry, rate limits, credit depletion)

Moving the generation to a pre-push hook instead means:
- Uses your existing Claude Max subscription via `claude -p`
- No API keys anywhere in the project
- Failures happen on your machine where you can debug them, not in CI
- Slightly less "hands-free" (you have to push rather than it running on every Vercel deploy) but this is a trivial difference

The `/open-pr` slash command wraps push + description generation + PR creation into one command, so daily use is still one-shot.

## The review page is the product

Everything else in this playbook is scaffolding around this moment: a PR opens, the preview URL arrives in your inbox (or Slack, or SMS), and you can approve or reject in under 60 seconds on your phone. If this page doesn't give you confidence to approve without reading code, it's broken and you should iterate until it does.

## What to watch for

- First preview deploy might need manual Vercel login and project link — follow prompts from Claude Code
- Chromatic's initial baseline capture takes a few minutes — first PR after setup will have a big diff queue (that's normal)
- `.github/workflows/ci.yml` must have the correct Node version matching `.nvmrc`
- CI must NOT require any `ANTHROPIC_*` secrets — if Claude Code tries to add them, push back
- Pre-push hook can be slow (Playwright + Lighthouse + claude -p) — consider adding a `--skip-review-page` flag for rapid WIP pushes
- Branch protection on `main` is crucial — without it, nothing prevents direct pushes that skip review

## Red flags to push back on

- **Any mention of `ANTHROPIC_API_KEY` in `.github/workflows/`** — hard stop, the whole point is avoiding this
- `preview-comment.yml` or any CI workflow that calls Claude — should be local pre-push instead
- No QR code on preview URLs (mobile review is the whole point)
- Missing Lighthouse scores in PR description (you need to see perf/a11y at a glance)
- Pre-push hook that runs on every commit (should only run on push, and ideally only on push to non-main branches)
- `/_dev/kiosk` appearing in the public sitemap or the PR screenshot gallery — it's dev-only
- Screenshot gallery shooting deferred routes (`/notes`, `/projects`, `/work-with-me`) — they aren't live; the gallery must shoot only `/`, `/colophon`, `/off-trail` at launch
- Commit list on the kiosk's TrailRegisterRail showing seed-fallback SHAs on a full-clone deploy — means the `prebuild` hook didn't run or couldn't see git history

## Test before moving on

Create a trivial PR (e.g., "update README.md") and verify:
1. Pre-push hook runs and generates `.pr-description.md`
2. Vercel preview deploys
3. PR body contains all 6 elements (check on GitHub)
4. QR code resolves to the preview URL
5. Chromatic diff queue is reachable
6. `verify:all` passes in CI (no Claude calls in CI)
7. Branch protection blocks merge until you approve

If any of these fail, fix before Prompt 12.
