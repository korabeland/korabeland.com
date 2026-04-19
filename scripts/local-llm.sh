#!/usr/bin/env bash
# Fallback: pipe a prompt to LM Studio and print the response text.
# Usage: echo "What is 2+2?" | bash scripts/local-llm.sh
set -euo pipefail

PROMPT=$(cat)
LM_STUDIO_URL=${LM_STUDIO_URL:-http://localhost:1234}
MODEL=$(curl -sf "${LM_STUDIO_URL}/v1/models" | jq -r '.data[0].id')

curl -sf "${LM_STUDIO_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg p "$PROMPT" --arg m "$MODEL" \
    '{model:$m,messages:[{role:"user",content:$p}],max_tokens:1024,temperature:0.3}')" \
  | jq -r '.choices[0].message.content'
