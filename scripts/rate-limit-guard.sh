#!/usr/bin/env bash
# Source this file to get claude_guarded() — a claude -p wrapper with retry logic.
# Enforces: max 3 retries, 1s sleep between, clean exit on repeated failures.
#
# Usage:
#   source scripts/rate-limit-guard.sh
#   printf '%s' "$prompt" | claude_guarded -p --model sonnet --output-format text
#
# Overridable env vars:
#   CLAUDE_MAX_RETRIES  — total attempts (default: 3)
#   CLAUDE_RETRY_SLEEP  — seconds between attempts (default: 1)

CLAUDE_MAX_RETRIES=${CLAUDE_MAX_RETRIES:-3}
CLAUDE_RETRY_SLEEP=${CLAUDE_RETRY_SLEEP:-1}

claude_guarded() {
  local attempt=1 exit_code=0 _stdin=""

  # Buffer stdin once so it can be replayed across retries.
  [[ -t 0 ]] || _stdin=$(cat)

  while [[ $attempt -le $CLAUDE_MAX_RETRIES ]]; do
    exit_code=0
    if [[ -n "$_stdin" ]]; then
      printf '%s' "$_stdin" | claude "$@" || exit_code=$?
    else
      claude "$@" || exit_code=$?
    fi

    [[ $exit_code -eq 0 ]] && return 0

    if [[ $attempt -lt $CLAUDE_MAX_RETRIES ]]; then
      echo "[rate-limit-guard] attempt $attempt failed (exit $exit_code), retrying in ${CLAUDE_RETRY_SLEEP}s..." >&2
      sleep "$CLAUDE_RETRY_SLEEP"
    fi
    ((attempt++))
  done

  echo "[rate-limit-guard] all $CLAUDE_MAX_RETRIES attempts exhausted (last exit $exit_code)." >&2
  return "$exit_code"
}
