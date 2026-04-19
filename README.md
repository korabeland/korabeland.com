# Personal Site

Korab's personal website — Astro 5 + Keystatic + shadcn/ui + Tailwind 4, deployed on Vercel. Built and maintained by an AI team orchestrated through Claude Code. You never need to touch the code.

---

## Getting Started

### Prerequisites

Install these once on your Mac:

**Node version manager** (pick one):
- [nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`
- [mise](https://mise.jdx.dev): `brew install mise` (also manages pnpm)

**pnpm** (Node package manager):
```sh
corepack enable
corepack prepare pnpm@10.33.0 --activate
```

**LM Studio** — download from [lmstudio.ai](https://lmstudio.ai). After install:
1. Search for and download `Qwen3.6-35B-A3B-4bit` (MLX format, ~20 GB)
2. Load the model and enable the Local Server (Settings → Local Server → Start)
3. Verify the server badge shows port 1234 and runtime shows "MLX"

**Ollama** (optional — secondary runtime for Gemma 4):
```sh
brew install ollama
```

---

### Quick Start

```sh
# 1. Clone the repo
git clone https://github.com/korabeland/personal-brand.git
cd "personal-brand/Dev Team"

# 2. Switch to the pinned Node version
nvm install   # reads .nvmrc automatically
nvm use       # activates 20.18.3
# or with mise:
mise install && mise use

# 3. Run the start-day script — verifies env, opens LM Studio if needed
bash scripts/start-day.sh
```

Once the health check is green, you're ready to work.

---

### If the health check fails

| Error | Fix |
|---|---|
| Node version mismatch | `nvm install 20.18.3 && nvm use` |
| pnpm version mismatch | `corepack enable && corepack prepare pnpm@10.33.0 --activate` |
| LM Studio not responding | Open LM Studio → enable Local Server on port 1234 |
| Qwen3 not loaded | In LM Studio, load `Qwen3.6-35B-A3B-4bit` and start the server |
| Ollama not running | `ollama serve` (optional — won't block the build) |

---

## If houtini-lm breaks

`houtini-lm` is the MCP bridge between Claude Code and LM Studio. It is registered in `.mcp.json` and loads automatically on session start.

**Verify it's working:**
```sh
claude mcp list
# Should show: houtini-lm — node node_modules/@houtini/lm/dist/index.js
```

**Curl fallback** (bypasses MCP entirely):
```sh
echo "What is 2+2?" | bash scripts/local-llm.sh
```

**Canary test** (checks the full local model path):
```sh
bash scripts/local-llm-test.sh
# ✓ Local LLM responding (pong)
```

**Re-register if `.mcp.json` gets corrupted:**
```sh
# Edit .mcp.json directly — add the entry under mcpServers:
# "houtini-lm": {
#   "command": "node",
#   "args": ["node_modules/@houtini/lm/dist/index.js"],
#   "env": { "LM_STUDIO_URL": "http://localhost:1234" }
# }
```

---

## Architecture

This is an AI-orchestrated build. You interact through:
- `claude` in a terminal — give natural-language instructions
- Vercel preview URLs on your phone — review every change visually
- Chromatic's diff queue — approve or reject visual changes

Every change produces a review page in the PR comment: preview URL, screenshots at 4 viewports, before/after diffs, and a plain-English summary of what changed.

See `setup prompts/00-master-plan-v2.md` for the full system design.

---

## Build Prompts

The 14-prompt playbook lives in `setup prompts/`. Run them in order — each prompt depends on the previous.

| # | Prompt | Status |
|---|---|---|
| 01 | Environment pinning | ✅ done |
| 02 | Orchestration rules and file ownership | — |
| 03 | Application scaffold (Astro + Keystatic + shadcn + Tailwind) | — |
| 04 | Verification stack (Biome, Vitest, Playwright, Lighthouse, axe) | — |
| 05 | Local model delegation (houtini-lm + curl fallback) | ✅ done |
| 06 | Cost controls and escalation pipeline | — |
| 07 | Subagent roster | — |
| 08 | Design direction | — |
| 09 | Content architecture | — |
| 10 | Component build-out | — |
| 11 | Deployment and preview infrastructure | — |
| 12 | SEO, performance, accessibility pass | — |
| 13 | Launch checklist | — |
| 14 | Ongoing operation mode | — |
