# Prompt 14 — The ongoing operation mode

**Phase:** 4 (Polish, deployment, review loop)
**Depends on:** Prompt 13 complete (site is live in production)
**Revised:** 2026-04-19 per `/office-hours` doc — flags `/new-blog-post` and `/new-project` as first-use post-launch (the MVP ships without seeded content), and adds a v1.1 weathering milestone entry.
**Expected outcome:** Slash commands and git hooks for all routine tasks, a runbook for non-routine ones, and a documented plan for the v1.1 weathering extension. Terminal surface area minimized.

---

## Paste into Claude Code

```
Now that the site is live, establish the ongoing operation mode — the
"how I actually use this every day" setup.

Create .claude/commands/ with slash commands for the recurring tasks:

1. /new-blog-post <topic>   [first use post-launch]
   Dispatches content-writer (local Qwen3.6 via houtini-lm) to draft a
   post, creates Keystatic entry, generates cover image placeholder,
   opens preview URL. Note: MVP ships with no seeded posts and /notes
   is unwired; first invocation also wires up /notes + /notes/[slug]
   routes (copy from the Post-launch wave appendix in Prompt 10).

2. /new-project <name>       [first use post-launch]
   Same pattern for portfolio entries. First invocation also wires up
   /projects + /projects/[slug] routes.

3. /refresh-design <inspiration-url>
   Runs design-director against a new inspiration source, produces a diff
   against current DESIGN.md, shows me the proposed changes for approval
   before any component changes.

4. /audit
   Runs full verify:all + Lighthouse + axe + broken link check, posts
   report.

5. /usage-status (already exists from Prompt 6)
   Shows Max weekly usage across Opus/Sonnet/Haiku.

6. /fix-my-env (already exists from Prompt 5)

7. /deploy-preview <branch>
   Forces a preview deploy of a specific branch and generates the review
   page via scripts/generate-pr-description.sh, useful when I want to
   experiment.

8. /open-pr (already exists from Prompt 11)
   Pushes branch, generates review page, opens PR.

9. /prune (already exists from Prompt 6)
   Takes pasted error text, returns pruned summary via scripts/prune-context.sh.

Also set up these headless-powered git hooks:

a. .husky/prepare-commit-msg — runs scripts/commit-message.sh to draft a
   conventional commit message when I run `git commit` without -m. I can
   still edit before saving.

b. .husky/pre-push — runs scripts/generate-pr-description.sh (from
   Prompt 11) to refresh the PR description before push.

c. .husky/post-merge — runs scripts/post-merge-cleanup.sh which:
   - Deletes merged local branches
   - Prunes worktrees (runs `git worktree prune`)
   - Runs pnpm install if package.json changed on main

Also create docs/operations.md — my personal runbook — with these sections:
- "I want to add a blog post" -> run /new-blog-post
- "I want to add a portfolio project" -> run /new-project
- "I want to redesign the homepage" -> describe in natural language,
  reviewer will decompose
- "Something is broken" -> run /fix-my-env or describe to Claude Code
- "I want to check usage" -> run /usage-status
- "The site is slow" -> run /audit
- "Morning startup" -> run scripts/start-day.sh
- "I want to open a PR" -> run /open-pr
- "I hit a weird error I want Claude to debug" -> run /prune with the
  error, then feed the pruned output to Claude Code directly

Document which commands run headless (claude -p, subscription-native) vs
which use interactive subagents, so I understand what's happening under
the hood.

This is the terminal-surface-area minimum. Everything routine is a slash
command or git hook; everything unusual is natural language to Claude Code.

Commit as "feat: ongoing operation mode — slash commands, hooks, and runbook".
```

---

## Your daily life after this prompt

Morning:
1. `./scripts/start-day.sh` — verifies environment, launches LM Studio, opens Claude Code
2. Type natural language or slash command
3. Review the preview page that arrives in your PR inbox
4. Approve with thumbs-up

That's the entire loop. If it's not that simple, something in the playbook is under-configured.

## Under the hood: three execution paths

Your slash commands and hooks dispatch to one of three execution paths. Understanding which is which helps you debug when something misbehaves:

| Path | Used for | What it hits |
|---|---|---|
| Interactive subagent | Multi-turn work: `/new-blog-post`, `/refresh-design`, `/audit` | Your Max subscription via interactive Claude Code |
| Headless `claude -p` | One-shot: commit messages, PR description generation, context pruning | Your Max subscription via non-interactive CLI |
| Local Qwen3.6 | High-volume prose, test stubs, boilerplate | LM Studio on port 1234 (free, local) |

No API keys anywhere. No external billing.

## What to watch for

- Each slash command file should be under 50 lines — they're thin wrappers around subagent dispatches or script invocations, not complex logic
- `docs/operations.md` should be scannable — treat it as the first place you look when you forget how to do something
- Slash commands should handle the common case AND include "if this fails, try X" fallback instructions
- Git hooks should be fast (under 30 seconds ideally). Pre-push is the exception — it runs Playwright and Lighthouse so 2-3 minutes is acceptable
- `/new-blog-post` should accept the topic as a parameter, not require an interactive prompt

## Red flags to push back on

- Slash commands that require you to fill in multiple parameters — simplify to one argument max
- Missing `docs/operations.md` — the runbook is as important as the commands
- `/audit` that doesn't actually run everything (it should cover verify:all + Lighthouse + axe + broken link check)
- `/refresh-design` that overwrites DESIGN.md without showing you the diff first
- Any git hook that calls the Anthropic API directly — should be `claude -p` via the scripts from Prompt 6

## Final test

Run through this scenario: you want to add a new blog post about a trip you just took. What do you type, and how many screens do you look at to ship it? The answer should be:

1. `claude` in terminal
2. `/new-blog-post reflections on my trip to japan`
3. Wait for preview URL
4. Review on phone
5. Thumbs up in Vercel Toolbar

Five steps, one command, and the post is live. If it takes more than that, iterate on the slash command.

---

## You've finished the playbook

From here, the site is yours to grow. Every new feature, every redesign, every blog post follows the same pattern: natural language to Claude Code -> orchestrator plans -> subagents execute -> review page arrives -> you approve. You never read code unless you want to.

The whole system is designed so that when you come back in six months and forget how it works, `docs/operations.md` and `scripts/start-day.sh` are all you need to rediscover the workflow.

---

## v1.1 milestone — weathering

Document this in `docs/operations.md` under a "Planned milestones" heading the first time Prompt 14 runs. Do not build it at launch; do not block launch on it. **Weathering needs time to accumulate to mean anything.**

**Premise.** Each production deploy leaves a visible pencil-tick on the kiosk, accumulating over time. After 40 deploys the rail fills in; after 3 years the register becomes a physical record of the site's own making.

**Mechanism sketch:**

1. Pre-deploy hook (`.vercel/build.sh` or a GitHub Action that runs before the Vercel deploy) appends a JSON record to `src/content/weathering/marks.json` with `{ sha, timestamp, author, subject }`.
2. `TrailRegisterRail.astro` (the file shipped at launch in Prompt 10 step 5) is extended to read from both `commits.json` (git history from the launch `prebuild` hook) and `marks.json` (deploy history). Visually capped at the most recent 14 entries with a "scroll back" affordance revealing older ones. v1.1 extends the existing file — it does not create a new one.
3. Optional visual accretion on `MapSurface.astro`: N commits since launch render as N tiny random scuffs at the map corners. Each scuff is a seeded `rough.js` squiggle with rotation + opacity deterministically hashed from the commit SHA. Seeded so visual-regression snapshots stay stable.
4. **Explicit anti-scope.** Not user-writable. Not a guestbook. Korab-only register, driven by actual commit + deploy activity.

**Effort estimate:** ~4 hours of Claude Code work once launch is stable.

**Owner at v1.1 time:** same file-ownership split as Prompt 10 — orchestrator owns the pre-deploy hook and `marks.json` seed; `ui-builder` owns the `TrailRegisterRail.astro` and `MapSurface.astro` extensions. Reference the original office-hours doc at `~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260419-145932.md` §v1.1 for full context.
