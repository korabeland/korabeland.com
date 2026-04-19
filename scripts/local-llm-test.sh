#!/usr/bin/env bash
# Sends a canary prompt to verify local model delegation is working.
# Exits 0 on success, 1 on failure.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESPONSE=$(echo "Reply with exactly the word: pong" | bash "${DIR}/local-llm.sh")

if echo "$RESPONSE" | grep -qi "pong"; then
  echo "✓ Local LLM responding ($(echo "$RESPONSE" | head -1))"
  exit 0
else
  echo "✗ Unexpected response: $RESPONSE"
  exit 1
fi
