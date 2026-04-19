#!/usr/bin/env bash
# Prunes raw error context (Playwright traces, DOM dumps, stack traces) to
# ≤500 tokens via Haiku. Preserves actionable info, strips noise.
#
# Usage: cat error-output.txt | bash scripts/prune-context.sh
# Output: pruned summary on stdout; progress/errors on stderr.
#
# Timeout: 30s per attempt (macOS-compatible background-kill approach).
# Retries: max 2 (3 total attempts).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=rate-limit-guard.sh
source "${SCRIPT_DIR}/rate-limit-guard.sh"

PRUNE_TIMEOUT=${PRUNE_TIMEOUT:-30}
CLAUDE_MAX_RETRIES=2  # tighter limit for the pruner specifically

PROMPT="Summarize this debugging context in ≤500 tokens. Preserve: file paths, line numbers, exact error messages, failing test names. Omit: stack frames from node_modules, HTML boilerplate, repeated log lines."

# Buffer stdin and write to a temp file (needed for timeout + retry with stdin).
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
{
  printf '%s\n\n' "$PROMPT"
  cat  # the raw error context from stdin
} > "$TMPFILE"

# Per-attempt timeout using background kill (macOS has no timeout(1) built in).
_invoke_with_timeout() {
  claude -p --model haiku --output-format text --no-session-persistence < "$TMPFILE" &
  local pid=$!
  ( sleep "$PRUNE_TIMEOUT" && kill -TERM "$pid" 2>/dev/null ) &
  local watcher=$!
  local rc=0
  wait "$pid" 2>/dev/null || rc=$?
  kill "$watcher" 2>/dev/null || true
  wait "$watcher" 2>/dev/null || true
  return $rc
}

# Retry loop (reuses TMPFILE so stdin is always available).
attempt=1
while [[ $attempt -le $CLAUDE_MAX_RETRIES ]]; do
  if _invoke_with_timeout; then
    exit 0
  fi
  rc=$?
  if [[ $attempt -lt $CLAUDE_MAX_RETRIES ]]; then
    echo "[prune-context] attempt $attempt failed (exit $rc), retrying in 1s..." >&2
    sleep 1
  fi
  ((attempt++))
done

echo "[prune-context] all attempts failed." >&2
exit 1
