# Personal Site

Korab's personal website — Astro 6 + Keystatic + shadcn/ui + Tailwind 4, deployed on Vercel. Built and maintained by an AI team orchestrated through Claude Code. You never need to touch the code.

---

## Getting Started

### Prerequisites

Install these once on your Mac:

Runtime: Node 22 — declared in `.nvmrc`.

**Node version manager** (pick one):
- [nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash` (then `nvm install && nvm use`)
- [mise](https://mise.jdx.dev): `brew install mise` (also manages pnpm; reads the pinned version from `.tool-versions`)

**pnpm** (Node package manager):
```sh
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

---

### Quick Start

```sh
# 1. Clone the repo (independent repo — not nested under personal-brand)
git clone https://github.com/korabeland/korabeland.com.git
cd korabeland.com

# 2. Switch to the pinned Node version
nvm install   # reads .nvmrc automatically
nvm use       # activates Node 22
# or with mise:
mise install && mise use

# 3. Run the start-day script
bash scripts/workflow/start-day.sh
```

Once the health check is green, you're ready to work.

---

### If the health check fails

| Error | Fix |
|---|---|
| Node version mismatch | `nvm install && nvm use` (reads `.nvmrc`) |
| pnpm version mismatch | `corepack enable && corepack prepare pnpm@10.33.0 --activate` |
| LM Studio not responding | Open LM Studio → enable Local Server on port 1234 |
| Qwen3 not loaded | In LM Studio, load `Qwen3.6-35B-A3B-4bit` and start the server |
| Ollama not running | `ollama serve` (optional — won't block the build) |

---

## Architecture

This is an AI-orchestrated build. You interact through:
- `claude` in a terminal — give natural-language instructions
- Vercel preview URLs on your phone — review every change visually
- Chromatic's diff queue — approve or reject visual changes

Every change produces a review page in the PR comment: preview URL, screenshots at 4 viewports, before/after diffs, and a plain-English summary of what changed.

For the codebase layout (directory tree, stack, build commands, file-ownership rules), see [`AGENTS.md`](AGENTS.md) §1–2. See [`docs/setup-prompts/00-master-plan-v2.md`](docs/setup-prompts/00-master-plan-v2.md) for the full system design.

---

## Verify & test

- `pnpm verify` — Biome + `tsc --noEmit` + `astro check`
- `pnpm test` — Vitest (non-visual, non-E2E)
- `pnpm test:visual` — Playwright visual + E2E. Local pixelmatch baselines are advisory; the blocking visual gate is Chromatic in CI
- `pnpm run lighthouse` — Lighthouse CI, desktop + mobile profiles
- `pnpm audit --prod --audit-level=high` — dependency security audit, blocking in CI
- `pnpm build` — production build

See [`AGENTS.md`](AGENTS.md) §2 for the full breakdown, including `pnpm verify:all` (chains verify + test + test:visual + lighthouse).

`package.json#engines` pins the Vercel build image to the Node 22 line declared in `.nvmrc` (Vercel was auto-selecting Node 24 before this was added) — verified via preview deployment on the next PR.

---

## Build Prompts

The 14-prompt playbook lives in `docs/setup-prompts/`. Run them in order — each prompt depends on the previous.

| # | Prompt | Status |
|---|---|---|
| 01 | [Environment pinning](docs/setup-prompts/01-environment-pinning.md) | ✅ done |
| 02 | [Orchestration rules and file ownership](docs/setup-prompts/02-orchestration-rules.md) | — |
| 03 | [Application scaffold (Astro + Keystatic + shadcn + Tailwind)](docs/setup-prompts/03-application-scaffold.md) | — |
| 04 | [Verification stack (Biome, Vitest, Playwright, Lighthouse, axe)](docs/setup-prompts/04-verification-stack.md) | — |
| 05 | [Local model delegation](docs/setup-prompts/05-local-model-delegation.md) | ✅ done |
| 06 | [Cost controls and escalation pipeline](docs/setup-prompts/06-escalation-pipeline.md) | — |
| 07 | [Subagent roster](docs/setup-prompts/07-subagent-roster.md) | — |
| 08 | [Design direction](docs/setup-prompts/08-design-direction.md) | — |
| 09 | [Content architecture](docs/setup-prompts/09-content-architecture.md) | — |
| 10 | [Component build-out](docs/setup-prompts/10-component-buildout.md) | — |
| 11 | [Deployment and preview infrastructure](docs/setup-prompts/11-deployment-preview.md) | — |
| 12 | [SEO, performance, accessibility pass](docs/setup-prompts/12-polish-passes.md) | — |
| 13 | [Launch checklist](docs/setup-prompts/13-launch-checklist.md) | — |
| 14 | [Ongoing operation mode](docs/setup-prompts/14-ongoing-operation.md) | — |
