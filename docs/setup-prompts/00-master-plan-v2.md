# The Non-Coder's AI Build Team: Hybrid Local + Cloud Stack for M5 Pro

**Revised v2 — April 17, 2026**

*Incorporates adopted changes from second-opinion review: file ownership rules, Haiku pre-escalation pruner, pixel-math primary visual diffs, pinned-version MCP with curl fallback, and `/fix-my-env` slash command. Subscription-native — no API keys, no dollar-based budget tracking; weekly Max limits enforced via rate-limit guards and the `/usage-status` dashboard.*

---

## Executive summary

You will build a dynamic personal website using a conductor-and-workers AI team on your M5 Pro (48 GB). Claude Code orchestrates. Qwen3.6-35B-A3B runs locally in LM Studio and handles 70–90% of token volume via the houtini-lm MCP bridge. Haiku 4.5 prunes error context before any cloud escalation, cutting debug token usage by 70–85%. Pixel-math deterministic diffs are the primary visual verification; vision models only interpret the diff region. Strict file-ownership rules prevent parallel-agent merge conflicts. A rate-limit guard on all headless `claude -p` calls prevents runaway loops from burning through your Max weekly allocation.

You never touch code. You interact through: (1) `claude` in a terminal, (2) Vercel preview URLs on your phone, (3) Chromatic's diff queue in a browser. Every change produces a six-element review page in the PR comment — preview URL with QR code, screenshot gallery at 4 viewports, video walkthrough, Chromatic diff link, before/after diff images, plain-English markdown summary.

Stack: Astro 5 + Keystatic + shadcn/ui + Tailwind 4 on Vercel. Recurring cost: Max subscription (already paid) + $20 Vercel Pro + $0 everything else. Local Qwen3.6 and all headless `claude -p` invocations ride on infrastructure you already have.

---

## Local model landscape (April 2026)

**Qwen3.6-35B-A3B** (released April 16, 2026) is the primary coder. MoE architecture with 3B active / 35B total parameters. Scores 73.4 on SWE-bench Verified, 51.5 on Terminal-Bench 2.0 — best in class for local-runnable agentic coding. Native vision, 262K context (1M via YaRN). Hybrid Gated-DeltaNet + MoE.

**Download**: `https://huggingface.co/mlx-community/Qwen3.6-35B-A3B-4bit` (20.4 GB, MLX format, uploaded by Prince Canuma — the mlx-vlm maintainer)

**Gemma 4 26B** as secondary for multimodal tasks. 256K native context, strong at vision-language but weaker at agentic coding (17.4 SWE-bench). Use for alt text, fast chat, backup multimodal review.

### Memory budget on 48 GB M5 Pro

Reserve 8–12 GB for macOS and apps, leaving 36–40 GB for models + KV cache + workspace.

| Model | Recommended quant | RAM footprint | Best use |
|---|---|---|---|
| **Qwen3.6-35B-A3B** | **MLX 4-bit** | **20–24 GB** | Primary agentic coder |
| Gemma 4 26B | Q4_K_M | 18 GB | Multimodal, alt text, backup |
| Qwen3-Coder-30B-A3B Flash | Q4_K_M | 19 GB | Fallback if 3.6 flakes |

**Performance on M5 Pro (MLX 4-bit, 8K context)**: Qwen3.6 at 55–80 tokens/sec. Gemma 4 at 30–45 tokens/sec. Drops ~30% at 32K context as KV cache grows.

**Critical**: Use LM Studio's MLX runtime, not llama.cpp/GGUF. MLX is 20–50% faster on Apple Silicon. Verify the runtime badge says "MLX" when loading the model.

---

## Team architecture: Configuration A (Orchestra Hybrid)

**Claude Code is the conductor.** Opus 4.6 for Plan mode on hard architectural decisions. Sonnet 4.6 for most subagent work. Haiku 4.5 for cheap orchestration (and as the **pre-escalation context pruner**).

**Local Qwen3.6 is the workhorse.** Bounded high-volume tasks — component scaffolding, prose generation, test stubs, commit messages, code review summaries — delegate through `houtini-lm` MCP server or the curl-based fallback script.

**Deterministic hooks are the metronome.** Prettier, Biome, TypeScript checks, pixelmatch visual diffs, axe-core accessibility, Lighthouse performance — all run without any model at all.

### Six subagents in `.claude/agents/`

| Subagent | Model | Role | File ownership |
|---|---|---|---|
| design-director | Sonnet | Produces DESIGN.md from inspiration | main (writes DESIGN.md) |
| content-writer | Haiku + local | Prose, SEO, alt text | `src/content/` only |
| ui-builder | Sonnet | shadcn component composition | `src/components/<new>/` only |
| test-stub | Haiku + local | Vitest/Playwright scaffolds | `tests/` only |
| visual-reviewer | Haiku + local VL | Sequential screenshots + pixel diffs | main (reads only) |
| reviewer | Sonnet | Cross-cutting review, review page | main (reads only) |

Subagents can also shell out to `claude -p` via the scripts in `scripts/` for bounded one-shot tasks (commit messages, context pruning, classification). All three execution paths — interactive, headless, local — use the same subscription or run free locally.

### Dispatch pattern

Parallel subagents run in git worktrees (`isolation: worktree`). Orchestrator runs in main branch. Work is dispatched in **waves** that respect file ownership:
- Wave 1: leaf components (no dependencies, pure parallel)
- Orchestrator regenerates barrel file, commits
- Wave 2: composed components (depend on Wave 1)
- Orchestrator regenerates barrel file, commits
- Wave 3: page-level components
- Orchestrator runs `pnpm verify:all`, produces review page

---

## File ownership rules (hard guardrail)

**ORCHESTRATOR-ONLY** files. No parallel subagent may modify:

- `astro.config.*` / `next.config.*`
- `package.json`, `pnpm-lock.yaml`
- `tailwind.config.*`, `postcss.config.*`
- `tsconfig.json`
- `keystatic.config.ts`
- `.env*`, `.nvmrc`, `.tool-versions`
- Any `index.ts` / `index.tsx` barrel file
- `.claude/` directory contents

**Auto-generated.** `scripts/gen-barrels.ts` regenerates barrel files deterministically between waves — no hand-editing ever.

**Parallel-safe.** Subagents freely create files in `src/components/<new>/`, `src/content/`, `tests/`, `docs/`.

Without these rules, parallel agents create merge conflicts that neither the agents nor you can resolve cleanly. This is the single most important guardrail in the entire playbook.

---

## Task routing matrix

The operative principle is **verifiability, not difficulty**. Local models handle anything a machine can confirm is correct. Cloud models handle judgment and cross-system reasoning.

| Task | Route | Automated gate |
|---|---|---|
| Component scaffolding | Local | Storybook renders + pixel diff + tsc |
| Tailwind/CSS refactoring | Local | Visual regression at 4 breakpoints |
| TypeScript types from data | Local | `tsc --noEmit` |
| SEO metadata, OG tags | Local | Playwright assertions on `<head>` |
| Image alt text | Local VL | axe-core alt rule |
| Unit test writing | Local | Tests execute, exercise target |
| E2E test scaffolding | Hybrid | `playwright test` green |
| JSDoc, markdown content | Local | Lint, Prettier |
| Design tokens | Local | Contrast-ratio check |
| API route boilerplate | Local | Zod schema + integration test |
| Commit messages, PR summaries | Local | Conventional Commits regex |
| Linting/formatting | Hook (no model) | Tool exits 0 |
| **Architecture decisions** | Cloud | Human review + ADR doc |
| **Debugging complex issues** | Cloud (pruned) | Repro test added and passes |
| Initial scaffolding | Cloud | Build + deploy preview succeeds |
| Performance optimization | Cloud | Lighthouse perf ≥ 0.9 |

---

## Verification stack

Four layers, fastest at the bottom, runs on every agent action:

**Layer 1 — Static checks.** Biome 2.x, TypeScript strict, `pnpm verify` as single command. Husky pre-commit hook.

**Layer 2 — Unit tests.** Vitest 2.x. Tests-first pattern for new features (write failing tests from spec before implementation — cuts wasted iterations in half).

**Layer 3 — E2E and visual.** Playwright 1.56+ with Agents system. Screenshots at 375/768/1280/1920 px viewports. **Pixelmatch/odiff as primary diff (deterministic, zero tokens)**, local VL model only invoked on diff regions exceeding 0.5% threshold. Chromatic for Storybook visual regression with UI diff queue.

**Layer 4 — Performance and accessibility.** Lighthouse CI (performance ≥ 0.9, accessibility ≥ 0.95, LCP ≤ 2500ms, CLS ≤ 0.1). @axe-core/playwright (zero critical/serious violations).

Single command `pnpm verify:all` runs everything. Gate for every agent output before it reaches you.

### The pixel-first, vision-second pattern

This is a deliberate inversion of the common "ask the VL model to compare" approach. Pixelmatch is deterministic, free, and instant. It either passes or fails with a clear percentage. Only when pixels disagree do you need a model to describe the semantic change — and even then, process viewports sequentially (mobile, clear context, tablet, clear context, desktop) to avoid vision-model attention dilution.

---

## Escalation pipeline and usage controls

**Subscription-native, no API keys.** All Claude invocations flow through your Max subscription — interactive Claude Code sessions for multi-turn work, headless `claude -p` calls in scripts for one-shot transformations. No `ANTHROPIC_API_KEY` anywhere in the project, no separate billing, no SQLite budget tracking.

**Three execution paths:**

| Path | Used for | What it hits |
|---|---|---|
| Interactive subagents | Multi-turn work with Plan mode | Max subscription, interactive |
| Headless `claude -p` in scripts | One-shot transforms (commit msgs, pruning, classification) | Max subscription, non-interactive |
| Local Qwen3.6 via houtini-lm | High-volume prose, test stubs, boilerplate | LM Studio locally (free) |

**Haiku pruner before any cloud escalation.** Raw error context (Playwright traces, DOM dumps, stack traces, test output) never goes directly to Opus or Sonnet. `scripts/prune-context.sh` pipes it through `claude -p --model haiku` with a fixed prompt preserving file paths, line numbers, and errors while omitting node_modules frames and boilerplate. Reduces tokens to downstream calls by 40–80%, which matters for staying under weekly Max limits during heavy use.

**Per-task caps and three-strike escalation.** Agent SDK's `max_turns=15` per task. Local task fails → retry with expanded context → retry once more → `scripts/escalate.sh` runs (pruner + Sonnet). Rate-limit guard prevents runaway loops from burning weekly usage.

**Weekly usage visibility.** `/usage-status` slash command surfaces current Max weekly allocation — Opus/Sonnet/Haiku breakdown, projected depletion date. This replaces the original plan's dollar-based budget tracking since you're not billed per token.

---

## Model Context Protocol (MCP) strategy

**Primary:** `houtini-lm` MCP server exposing local Qwen3.6 as bounded tools (generate_content, rewrite, generate_tests, vision_describe, etc.). Version pinned exactly in `package.json` — no `^` floating ever.

**Fallback:** `scripts/local-llm.sh` — a 20-line curl wrapper posting to LM Studio's OpenAI-compatible `/v1/chat/completions` on port 1234. Invoked from Claude Code's `Bash` tool when `houtini-lm` is broken or updating. Documented in README under "If houtini-lm breaks."

**Other MCP servers worth adding:**
- Playwright MCP — for screenshot automation and visual diff loops
- Figma MCP — if you use Figma for inspiration
- shadcn MCP — official component registry integration
- Chromatic MCP — visual regression queue management

Do not rely on any single MCP as a single point of failure. The curl fallback is the escape hatch.

---

## User-facing interface

**What you actually see per change** — a single auto-generated **review page** in the PR comment, six elements in this exact order:

1. **Large Vercel preview URL with QR code** (mobile review friendly)
2. **Screenshot gallery** at 375/768/1280/1920 px for every route
3. **Video walkthrough** (2–3 minutes, captured by Playwright)
4. **Storybook/Chromatic link** showing pending visual diffs
5. **Before/after diff images** with red-highlighted changes
6. **Plain-English markdown summary** of what changed, which gates passed, and Max weekly usage delta (Opus/Sonnet/Haiku minutes consumed)

**What you never see:** raw code diffs, test logs, build output, decisions the agent could have made itself.

**Approval is one click.** Vercel Toolbar comments sync to GitHub. Chromatic has its own approve/reject UI. Slack or email webhook sends "Preview ready at [URL]. Reply 👍 to ship."

---

## Slash commands for daily operation

All in `.claude/commands/`:

| Command | Purpose | Execution path |
|---|---|---|
| `/new-blog-post <topic>` | Drafts post via local model, creates Keystatic entry, opens preview | Interactive + local |
| `/new-project <name>` | Same pattern for portfolio entries | Interactive + local |
| `/refresh-design <url>` | Runs design-director on new inspiration, shows diff against DESIGN.md | Interactive |
| `/audit` | Full verify:all + Lighthouse + axe + broken link check | Deterministic tools |
| `/usage-status` | Today's and week's Max usage across Opus/Sonnet/Haiku | Headless |
| `/fix-my-env` | Parses terminal errors via Sonnet, returns one-line shell fix | Headless |
| `/deploy-preview <branch>` | Forces preview deploy + review page for experimentation | Interactive + headless |
| `/open-pr` | Pushes branch, generates review page, opens PR via gh CLI | Headless |
| `/prune` | Takes pasted error text, returns pruned summary | Headless |

Plus `scripts/start-day.sh` — single command to verify environment, launch LM Studio, open Claude Code.

Plus git hooks: `prepare-commit-msg` drafts conventional commit messages, `pre-push` generates PR description, `post-merge` cleans up branches and worktrees. All powered by headless `claude -p`.

---

## Workflow: from inspiration to deploy

1. **Capture inspiration.** Screenshots, Pinterest links, Figma URLs, or paragraph of vibes into Claude Code. Figma MCP pulls design context automatically.

2. **Design spec.** `design-director` subagent produces `DESIGN.md`: mood, color tokens (hex + OKLCH + WCAG matrix), type scale, spacing, component inventory, sitemap, motion principles.

3. **Plan mode decomposition.** Claude Code's Plan mode generates checklist. You approve or edit.

4. **Parallel execution in waves.** Subagents in git worktrees each own dedicated folders. Orchestrator regenerates barrels between waves.

5. **File-based handoff.** `DESIGN.md` → `create-astro` config. Tokens → shadcn theming. Keystatic schemas → content agent. Playwright MCP screenshots → visual-diff reviewer. Git is the memory layer.

6. **Checkpoint delivery.** On `git push`, Vercel posts preview URL, Playwright publishes gallery, Chromatic queues diffs, reviewer generates six-element review page.

7. **Feedback loop.** Annotate screenshots in Vercel Toolbar (syncs to GitHub) or type natural language to Claude Code. Pixel-diff loop re-screenshots and iterates until match.

---

## The 14-prompt playbook

Build this system progressively using the 14 prompts in `prompts/`:

**Phase 1 — Foundation**
1. Environment pinning and reproducibility
2. Orchestration rules and file ownership
3. Application scaffold (Astro + Keystatic + shadcn + Tailwind)
4. Verification stack (Biome, Vitest, Playwright, Lighthouse, axe)

**Phase 2 — Local model plumbing and escalation**
5. Local model delegation bridge (houtini-lm + curl fallback + /fix-my-env)
6. Escalation pipeline (headless `claude -p` scripts + Haiku pruner + rate-limit guard)
7. Subagent roster (six specialized agents with file ownership)

**Phase 3 — Content and design**
8. Design direction from inspiration
9. Content architecture (Keystatic schemas)
10. Component build-out (waves)

**Phase 4 — Polish, deployment, review loop**
11. Deployment and preview infrastructure (Vercel + Chromatic + CI)
12. SEO, performance, accessibility pass (five review cycles)
13. Launch checklist (14 green/red items)
14. Ongoing operation mode (slash commands + runbook)

---

## What's different from v1

The original plan was solid on local model choice, verification layers, and orchestration pattern. v2 hardens it against the failure modes a second-opinion review surfaced:

**Adopted from second opinion:**
- **File ownership rules** enumerated explicitly in AGENTS.md (prevents worktree merge hell)
- **Haiku 4.5 pre-escalation pruner** (cuts cloud debug costs 70–85%)
- **Pixel-math primary, VL fallback** for visual diffs (deterministic + context-safe)
- **Pinned MCP versions + curl fallback** (eliminates single point of failure)
- **Rate-limit guard on headless `claude -p` calls** (prevents runaway loops from burning the Max weekly allocation)
- **`/fix-my-env` slash command** (non-coder escape hatch for env errors)
- **Sequential viewport processing** in visual-reviewer (avoids VL context saturation)
- **Morning script** `scripts/start-day.sh` (reduces terminal friction)

**Rejected from second opinion:**
- **Building a GUI dashboard** — becomes its own maintenance project; pinned env + morning script + `/fix-my-env` is more robust
- **Switching to OpenCode preemptively** — stays as Configuration B escape hatch only
- **Qwen3.6 as the pruner** — Haiku is more faithful for structured debugging output
- **Eliminating terminal entirely** — a well-pinned environment doesn't need abstraction

---

## Final pragmatic notes

**The real unlock isn't any single model.** It's that verifiability has caught up with generation. Playwright Agents, Chromatic, Lighthouse, axe-core, and pixelmatch together mean a local 35B-A3B model can do most of the work and you'll know whether it worked without reading code.

**Hooks beat agents** for anything deterministic. Never pay a model to run Prettier.

**The review surface matters more than internal orchestration cleverness.** If your Vercel preview URL, Playwright gallery, and Chromatic diff queue are sharp, you can direct any competent agent team. If they're not, no orchestration can save you.

**Start with Prompt 1 today.** Don't skip to Prompt 8 "where the real work starts" — the scaffolding *is* the real work. Phases 3 and 4 only work because Phases 1 and 2 established the guardrails.
