# Prompt 5 — Local model delegation bridge

**Phase:** 2 (Local model plumbing)
**Depends on:** Prompts 1–4 complete. LM Studio running Qwen3.6-35B-A3B (MLX 4-bit) on port 1234. Ollama installed.
**Expected outcome:** Claude Code can delegate tasks to local Qwen3.6 via `houtini-lm` MCP server, with a curl-based fallback if that server breaks, and a slash command to diagnose environment errors.

---

## Paste into Claude Code

```
Wire the local model delegation path. I have LM Studio running Qwen3.6-35B-A3B
(MLX 4-bit) on port 1234 and Ollama available as fallback.

Primary path:
- Install houtini-lm MCP server, PIN the exact version in package.json
  (no ^ floating)
- Add it to Claude Code via `claude mcp add houtini-lm` with
  LM_STUDIO_URL=http://localhost:1234
- Verify the MCP tools are visible in a test Claude Code session

Fallback path (the escape hatch if houtini-lm breaks):
- Create scripts/local-llm.sh that accepts a prompt via stdin and POSTs to
  LM Studio's OpenAI-compatible /v1/chat/completions endpoint, returning
  the response text to stdout
- Create scripts/local-llm-test.sh that sends a canary prompt and verifies
  the response
- Document both in README.md under "If houtini-lm breaks"

Also create .claude/commands/fix-my-env.md as a slash command: when invoked,
it reads the most recent terminal error from my clipboard (or takes it as
argument), sends it to Sonnet with context about this project's stack,
and returns a one-line shell fix. This is my escape hatch for environment
errors I can't diagnose myself.

Commit as "feat: local model delegation with houtini-lm primary and curl fallback".
```

---

## Pre-flight check before running this prompt

Before you paste this, confirm:

1. LM Studio is running and the server is ON (Developer tab → Start Server)
2. You can hit `http://localhost:1234/v1/models` in a browser and see Qwen3.6 listed
3. The MLX runtime is selected (not llama.cpp/GGUF) — check the runtime badge in LM Studio
4. Ollama is installed (`ollama list` returns something, even if empty)

If any of these fail, fix first — this prompt assumes the local model infrastructure is already working.

## What to watch for

- `houtini-lm` version in `package.json` must be an exact pin (e.g., `"@houtini/lm": "1.2.3"`), never `"^1.2.3"`
- After `claude mcp add houtini-lm`, the `/mcp` command in Claude Code should list the houtini tools
- `scripts/local-llm-test.sh` must actually succeed — it's the canary that tells you local delegation is working
- The `/fix-my-env` slash command is your lifeline for environment errors; test it by deliberately breaking something small and running it

## Red flags to push back on

- `houtini-lm` installed as a dev dependency with `^` — must be exact
- Fallback script using `http://127.0.0.1:1234` instead of `localhost:1234` (usually fine but be consistent)
- Missing README documentation of the fallback — if `houtini-lm` breaks at 11pm on a Friday, you need discoverable instructions
