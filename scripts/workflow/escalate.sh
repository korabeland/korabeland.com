#!/usr/bin/env bash
# Escalates a failure to Sonnet (or Opus) after pruning context through Haiku.
# This is the third-strike handler: local model has failed 3 times, now we call in Sonnet.
#
# Usage:
#   echo "failure description" | bash scripts/workflow/escalate.sh
#   bash scripts/workflow/escalate.sh "failure description"
#   bash scripts/workflow/escalate.sh --model opus "critical auth failure"
#
# Flags:
#   --model sonnet|opus  — override escalation target (default: sonnet)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=rate-limit-guard.sh
source "${SCRIPT_DIR}/rate-limit-guard.sh"

MODEL="sonnet"

# Parse --model flag before any positional args.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="$2"; shift 2 ;;
    --model=*) MODEL="${1#*=}"; shift ;;
    *) break ;;
  esac
done

# Get the failure description from remaining args or stdin.
if [[ $# -gt 0 ]]; then
  FAILURE="$*"
else
  FAILURE=$(cat)
fi

if [[ -z "$FAILURE" ]]; then
  echo "[escalate] No failure description provided. Pass as argument or pipe via stdin." >&2
  exit 1
fi

echo "[escalate] Pruning context with Haiku before escalation..." >&2
PRUNED=$(printf '%s' "$FAILURE" | bash "${SCRIPT_DIR}/prune-context.sh")

# Derive versions at run time so the prompt cannot drift from the repo.
# Run from the repo root (parent of scripts/workflow), as health-check.sh does.
cd "${SCRIPT_DIR}/../.."
ASTRO_VERSION="$(node -e "process.stdout.write(require('./package.json').dependencies.astro.replace(/^[^0-9]*/, ''))")"
NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"
PNPM_VERSION="$(node -e "process.stdout.write(require('./package.json').packageManager.split('@')[1])")"

echo "[escalate] Escalating to ${MODEL}..." >&2
{
  printf 'You are debugging a failing task in a personal website project.\n'
  printf 'Stack: Astro %s, TypeScript strict, Tailwind CSS 4 (Vite plugin), shadcn/ui (React islands), Keystatic local-git CMS, Vercel adapter (static by default), pnpm %s, Node %s, macOS Apple Silicon.\n\n' "$ASTRO_VERSION" "$PNPM_VERSION" "$NODE_VERSION"
  printf 'Debugging context (pre-pruned):\n%s\n\n' "$PRUNED"
  printf 'Provide:\n1. Root cause (1–2 sentences)\n2. Exact fix with file paths and code changes\n3. One-line verification command\n'
} | claude_guarded -p --model "$MODEL" --output-format text --no-session-persistence
