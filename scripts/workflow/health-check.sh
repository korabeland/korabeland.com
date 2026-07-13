#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"

cd "${ROOT_DIR}"

echo "=== Health Check ==="
echo ""

# ---- Node version ----
REQUIRED_NODE="$(cat .nvmrc | tr -d '[:space:]')"
# Compare majors: .nvmrc pins the line (e.g. "22"), not a patch release.
# `command -v` first: a missing node would otherwise yield an empty string
# (the pipeline exits via cut's status, so the || fallback never fires).
if command -v node >/dev/null 2>&1; then
  ACTUAL_NODE="$(node --version | tr -d 'v' | cut -d. -f1)"
else
  ACTUAL_NODE="not-installed"
fi

echo "Node:  required=${REQUIRED_NODE}  actual=${ACTUAL_NODE}"
if [ "${ACTUAL_NODE}" != "${REQUIRED_NODE}" ]; then
  echo ""
  echo "❌  FAIL: Node version mismatch."
  echo "    Required: ${REQUIRED_NODE}"
  echo "    Installed: ${ACTUAL_NODE}"
  echo ""
  echo "    Fix: nvm install ${REQUIRED_NODE} && nvm use"
  echo "         (or: mise install && mise use)"
  exit 1
fi
echo "✅  Node ${ACTUAL_NODE}"

# ---- pnpm version ----
REQUIRED_PNPM="$(node -e "process.stdout.write(require('./package.json').packageManager.split('@')[1])")"
ACTUAL_PNPM="$(pnpm --version 2>/dev/null || echo "not-installed")"

echo "pnpm:  required=${REQUIRED_PNPM}  actual=${ACTUAL_PNPM}"
if [ "${ACTUAL_PNPM}" != "${REQUIRED_PNPM}" ]; then
  echo ""
  echo "❌  FAIL: pnpm version mismatch."
  echo "    Required: ${REQUIRED_PNPM}"
  echo "    Installed: ${ACTUAL_PNPM}"
  echo ""
  echo "    Fix: corepack enable && corepack prepare pnpm@${REQUIRED_PNPM} --activate"
  exit 1
fi
echo "✅  pnpm ${ACTUAL_PNPM}"

# ---- LM Studio ----
echo "LM Studio: checking localhost:1234..."
LMSTUDIO_RESPONSE="$(curl -s --max-time 5 http://localhost:1234/v1/models 2>/dev/null || echo "")"

if [ -z "${LMSTUDIO_RESPONSE}" ]; then
  echo ""
  echo "❌  FAIL: LM Studio is not responding on port 1234."
  echo "    Open LM Studio → Settings → Local Server → Start Server"
  exit 1
fi

if ! echo "${LMSTUDIO_RESPONSE}" | grep -qi "qwen3"; then
  echo ""
  echo "❌  FAIL: LM Studio is running but no Qwen3 model is loaded."
  echo "    In LM Studio: load 'Qwen3.6-35B-A3B-4bit' (MLX runtime) and start the server."
  exit 1
fi
echo "✅  LM Studio: running with Qwen3 model loaded"

# ---- Ollama (soft warning — optional) ----
echo "Ollama: checking localhost:11434..."
if ! curl -s --max-time 3 http://localhost:11434/api/version > /dev/null 2>&1; then
  echo "⚠️   WARNING: Ollama is not running."
  echo "     It's optional (used for Gemma 4 backup). Start it with: ollama serve"
else
  echo "✅  Ollama: running"
fi

echo ""
echo "=== Health check passed ✅ ==="
