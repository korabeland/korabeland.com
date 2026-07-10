# Prompt 7 — Subagent roster

**Phase:** 2 (Local model plumbing)
**Depends on:** Prompts 5 & 6 complete
**Expected outcome:** Six specialized subagents in `.claude/agents/`, each with strict file-ownership boundaries and model routing. This is the team you'll dispatch for all real work.

---

## Paste into Claude Code

```
Create the subagent roster now that the plumbing is in place. Each subagent
lives in .claude/agents/ as a markdown file with YAML frontmatter.

Create these six subagents:

1. design-director.md
   - model: sonnet (cloud, this is judgment work)
   - description: Ingests inspiration (screenshots, URLs, vibes) and produces
     DESIGN.md with mood, color tokens, type scale, component inventory
   - tools: Read, Write, WebFetch
   - isolation: main (writes DESIGN.md, owned by orchestrator)

2. content-writer.md
   - model: haiku (cheap; real prose generation delegated to local)
   - description: Blog posts, SEO copy, alt text, page copy. Any prose over
     100 tokens MUST be delegated to houtini-lm (Qwen3.6 local).
   - tools: Read, Write, mcp__houtini-lm__generate_content
   - isolation: worktree
   - File ownership: may only write to src/content/

3. ui-builder.md
   - model: sonnet (component composition benefits from real reasoning)
   - description: Builds new shadcn/ui components in src/components/<name>/.
     May NOT touch astro.config, tailwind.config, or barrel files.
   - tools: Read, Write, Edit, Bash (for pnpm verify)
   - isolation: worktree
   - File ownership: src/components/<new-folder>/ only

4. test-stub.md
   - model: haiku; delegates body to houtini-lm
   - description: Generates Vitest and Playwright test scaffolds. Tests must
     execute and actually exercise the target code.
   - tools: Read, Write, Bash, mcp__houtini-lm__generate_tests
   - isolation: worktree

5. visual-reviewer.md
   - model: haiku (orchestrates; real comparison is pixel math, not VL)
   - description: Runs Playwright screenshots at 4 viewports SEQUENTIALLY
     (mobile, clear context, tablet, clear context, desktop, clear context).
     Runs pixelmatch against baselines FIRST. Only invokes local Qwen3-VL
     on the specific diff region if pixel diff exceeds threshold.
   - tools: Read, Bash, mcp__houtini-lm__vision_describe
   - isolation: main (reads across the whole app)

6. reviewer.md
   - model: sonnet (this is the "last line of defense" before PR merge)
   - description: Cross-cutting code review. Runs after all other subagents.
     Validates file ownership rules were respected. Confirms verify:all
     passes. Generates the six-element review page for my approval.
   - tools: Read, Bash, Grep
   - isolation: main

Commit as "feat: subagent roster with strict file ownership".
```

---

## The routing logic behind each model choice

- **Sonnet for design-director, ui-builder, reviewer** — these require judgment, cross-cutting context, and the ability to catch subtle issues. Not worth saving tokens here.
- **Haiku for content-writer and test-stub orchestration** — these subagents are mostly traffic controllers; the actual heavy lifting is delegated to local Qwen3.6 via houtini-lm MCP tools.
- **Haiku for visual-reviewer** — it orchestrates screenshots and pixel diffs, both of which are deterministic operations. Only the rare VL call is routed to local Qwen3-VL.

## Subagents can invoke headless Claude Code too

Since Prompt 6 established the `scripts/` directory with `claude -p` wrappers, subagents can shell out to them for bounded subtasks. Examples:

- `content-writer` can invoke `scripts/commit-message.sh` after writing a blog post
- `reviewer` can invoke `scripts/prune-context.sh` if it needs to summarize a long file for its review page
- Any subagent hitting an error can invoke `scripts/escalate.sh` as the final step before giving up

This is different from delegating to local Qwen3.6 via `houtini-lm` — headless Claude Code calls are for things that need Claude quality but not full interactive planning. Use the right tool for the job:

| Task type | Use |
|---|---|
| High-volume bounded prose, test stubs, refactors | Local Qwen3.6 via `houtini-lm` MCP |
| One-shot Claude transformations (commit msgs, pruning, classification) | Headless `claude -p` via scripts |
| Multi-turn reasoning with Plan mode | Interactive subagent dispatch |

All three run through your Max subscription (well, local Qwen3.6 is free locally). No API keys anywhere.

## What to watch for

- Each subagent file has complete YAML frontmatter — missing fields cause silent failures
- `isolation: worktree` subagents get their own git worktree; `isolation: main` run in the main workspace
- Tool restrictions matter — a ui-builder with `Edit` but not restricted to `src/components/` will inevitably edit `astro.config.mjs`
- File ownership enforcement is ultimately only as strong as the prompt in each subagent's description — make it explicit and threatening ("do NOT touch X; if you need X modified, return a request for the orchestrator to handle it")

## Red flags to push back on

- Giving any subagent access to `astro.config.*` or `package.json` — only the orchestrator touches those
- Using Opus for subagents — reserve Opus for Plan mode on the orchestrator level, not worker execution
- Missing the "delegate prose over 100 tokens to houtini-lm" rule in content-writer — that's the whole point of the local model

## Test after creation

In Claude Code, run `/agents` — all six should be listed and loadable. If any fail to parse, fix the YAML before moving on.

---

**Revised 2026-04-19** — `ui-builder` ownership extends to `src/components/TrailheadKiosk/` and `src/components/WeatherPill/` subfolders per the `/office-hours` doc. The `reviewer` subagent carries the mirror-sheen audit gate #1 defined in revised Prompt 10 Step 4 (artifact saved to `docs/reviews/<date>-mapsurface-audit.md`).
