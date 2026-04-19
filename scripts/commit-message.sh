#!/usr/bin/env bash
# Generates a conventional commit message for staged changes using Haiku.
#
# Usage:
#   bash scripts/commit-message.sh           — prints message to stdout
#   git commit -F <(bash scripts/commit-message.sh)
#   git commit -m "$(bash scripts/commit-message.sh)"
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=rate-limit-guard.sh
source "${SCRIPT_DIR}/rate-limit-guard.sh"

DIFF=$(git diff --cached)

if [[ -z "$DIFF" ]]; then
  echo "[commit-message] No staged changes. Stage files with git add first." >&2
  exit 1
fi

{
  printf 'Write a conventional commit message for these staged changes.\n'
  printf 'Format: type(scope): subject\n'
  printf 'Rules: subject ≤50 chars, no trailing period. Body optional (blank line separator). Output the commit message only — no explanation, no markdown fences.\n\n'
  printf '%s' "$DIFF"
} | claude_guarded -p --model haiku --output-format text --no-session-persistence
