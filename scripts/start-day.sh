#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"

cd "${ROOT_DIR}"

echo "=== Start Day ==="
echo ""

# ---- Launch LM Studio if not responding ----
if ! curl -s --max-time 3 http://localhost:1234/v1/models > /dev/null 2>&1; then
  echo "LM Studio is not running. Opening..."
  open -a "LM Studio"
  echo ""
  echo "⚠️   LM Studio is starting. Please:"
  echo "     1. Load the model: Qwen3.6-35B-A3B-4bit (MLX runtime)"
  echo "     2. Enable the Local Server on port 1234"
  echo "     3. Re-run this script once the server is ready:"
  echo "        bash scripts/start-day.sh"
  echo ""
  echo "     Ollama is optional — start manually if needed: ollama serve"
  exit 0
fi

# ---- Run health check ----
bash "${SCRIPT_DIR}/health-check.sh"

# ---- Next steps ----
echo ""
echo "=== Next steps ==="
echo ""
echo "  Prompt 2 → Orchestration rules + file ownership (.claude/agents/ + AGENTS.md)"
echo "             paste: setup prompts/02-orchestration-rules.md"
echo ""
echo "  Prompt 3 → Application scaffold (Astro 5 + Keystatic + shadcn + Tailwind 4)"
echo "             paste: setup prompts/03-application-scaffold.md"
echo ""
echo "  Prompt 4 → Verification stack (Biome, Vitest, Playwright, Lighthouse, axe)"
echo "             paste: setup prompts/04-verification-stack.md"
echo ""
echo "  Run 'pnpm dev' once Prompt 3 is complete."
echo ""
