#!/usr/bin/env bash
# Pre-commit gate: send staged content files to LM Studio for a spelling /
# grammar / voice review. Exits 0 if clean or if no content is staged; exits 1
# if the model finds issues or if LM Studio is unreachable while content is
# staged. Bypass with `git commit --no-verify`.
set -euo pipefail

LM_STUDIO_URL=${LM_STUDIO_URL:-http://localhost:1234}

FILES=()
while IFS= read -r -d '' path; do
  case "$path" in
    src/content/trail-register/*) continue ;;
  esac
  case "$path" in
    *.mdoc|*.md|*.mdx|*.json|*.yaml|*.yml) FILES+=("$path") ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR -z -- 'src/content/')

if [[ ${#FILES[@]} -eq 0 ]]; then
  exit 0
fi

if ! MODEL=$(curl -sf "${LM_STUDIO_URL}/v1/models" | jq -r '.data[0].id'); then
  echo "[review-content] LM Studio not reachable at $LM_STUDIO_URL. Start LM Studio and retry, or 'git commit --no-verify' to bypass." >&2
  exit 1
fi

if [[ -z "$MODEL" || "$MODEL" == "null" ]]; then
  echo "[review-content] No models available at $LM_STUDIO_URL. Load a model in LM Studio." >&2
  exit 1
fi

read -r -d '' SYSTEM <<'EOF' || true
You are an editor reviewing content for Korab Esperanca's personal site before commit. Check for: spelling errors, grammar errors, broken Markdown / MDX / Markdoc syntax, broken JSON or YAML in frontmatter, and obviously off-tone prose (the voice is plainspoken, lowercase-leaning, no marketing fluff, short sentences). Do not rewrite. Do not suggest stylistic changes that are merely preference.

Respond on the FIRST line with exactly `PASS` if clean, or `FAIL` if not. If `FAIL`, follow with one bullet per issue, each formatted as `- <path>: <issue>`. Output nothing else.
EOF

USER_PAYLOAD=""
for path in "${FILES[@]}"; do
  content=$(git show ":${path}")
  USER_PAYLOAD+="=== file: ${path} ==="$'\n'"${content}"$'\n\n'
done

REQUEST=$(jq -n \
  --arg sys "$SYSTEM" \
  --arg usr "$USER_PAYLOAD" \
  --arg m "$MODEL" \
  '{model:$m, messages:[{role:"system",content:$sys},{role:"user",content:$usr}], max_tokens:1024, temperature:0.2}')

if ! RAW=$(curl -sf "${LM_STUDIO_URL}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "$REQUEST"); then
  echo "[review-content] LM Studio not reachable at $LM_STUDIO_URL. Start LM Studio and retry, or 'git commit --no-verify' to bypass." >&2
  exit 1
fi

CONTENT=$(printf '%s' "$RAW" | jq -r '.choices[0].message.content // empty')

if [[ -z "$CONTENT" ]]; then
  echo "[review-content] Empty or malformed response from LM Studio:" >&2
  printf '%s\n' "$RAW" >&2
  exit 1
fi

FIRST_LINE=$(printf '%s\n' "$CONTENT" | awk 'NF{print; exit}')

if [[ "$FIRST_LINE" =~ ^PASS([[:space:]]|$) ]]; then
  echo "[review-content] PASS — ${#FILES[@]} file(s) reviewed by ${MODEL}" >&2
  exit 0
fi

echo "[review-content] FAIL — issues detected in staged content (model: ${MODEL}):" >&2
printf '%s\n' "$CONTENT" >&2
exit 1
