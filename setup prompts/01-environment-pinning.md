# Prompt 1 — Environment pinning and reproducibility

**Phase:** 1 (Foundation)
**Depends on:** nothing — run this first in an empty directory
**Expected outcome:** A pinned Node/pnpm environment with health-check and start-day scripts, committed to git. No application code yet.

---

## Paste into Claude Code

```
You are setting up a new personal website project. I am a non-coder taskmaster;
you will own all code decisions. Before writing any application code, establish
a fully pinned, reproducible development environment.

Create:
1. .nvmrc with Node 20 LTS
2. .tool-versions for mise/asdf (node, pnpm)
3. package.json with "packageManager" field pinning pnpm to a specific version
4. .gitignore appropriate for Astro + Node + macOS
5. README.md with a "Getting Started" section written for someone who has never
   touched this repo before
6. scripts/health-check.sh that verifies:
   - node version matches .nvmrc (hard fail — exit 1)
   - pnpm version matches package.json (hard fail — exit 1)
   - LM Studio is responding on port 1234 with Qwen3.6 loaded (hard fail — this is our primary local model runtime)
   - Ollama is running (soft warning only — optional secondary runtime for Gemma 4; do not block on this)
7. scripts/start-day.sh that runs health-check, opens LM Studio if not running,
   and prints the next steps. Do not auto-launch Ollama — it's optional.

Initialize git, commit as "chore: pin environment and add health scripts".
Do not install any application dependencies yet. Report back with the file
tree and confirm the health check passes on my machine.
```

---

## Runtime roles in this playbook

**LM Studio is primary.** It runs Qwen3.6-35B-A3B (MLX 4-bit) on port 1234 with the MLX runtime — this is 20–50% faster than llama.cpp on Apple Silicon. Every reference to "local model" in subsequent prompts means LM Studio. This must be running for the main workflow.

**Ollama is optional/secondary.** Useful for running Gemma 4 26B as a quick multimodal fallback or if LM Studio crashes. Not required for day-to-day operation. The health check warns but doesn't block if Ollama isn't running.

## What to watch for when Claude Code runs this

- The pnpm version pinned in `packageManager` should match what's actually installed on your Mac (`pnpm --version`)
- `health-check.sh` should exit 0 when run — if it exits 1, fix the underlying issue before moving on
- LM Studio check uses `curl -s http://localhost:1234/v1/models` — LM Studio must be running with the server enabled AND Qwen3.6 loaded for this to pass
- Ollama check is soft — it should print a warning like "Ollama not running (optional — only needed for Gemma 4 fallback)" but not block
- `start-day.sh` is your one-command morning startup — test it actually works before leaving this prompt

## Red flags to push back on

- Any `^` or `~` version ranges in `package.json` — everything should be pinned exactly
- Missing shebang line or `set -euo pipefail` in shell scripts
- Scripts that don't log what they're doing (silent failures are the enemy)

---

**Revised 2026-04-19** — see `/office-hours` doc at `~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260419-145932.md`. `roughjs` joins the dependency pin list, but it's added by the orchestrator during revised Prompt 10 Step 1 (not re-run here).
