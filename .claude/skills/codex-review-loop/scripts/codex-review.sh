#!/usr/bin/env bash
# codex-review.sh — run ONE headless codex review pass over the branch diff and
# emit schema-conforming JSON ({ "verdict": ..., "findings": [...] }) to a file.
#
# Usage: codex-review.sh <base-branch> <output-json-path> [repo-dir]
#
# Why `codex exec` and not `codex review`: in codex 0.142.5 the review subcommand
# ignores --output-schema (it returns prose) and under-reports simplifications.
# Plain `codex exec` honors the schema and accepts a full prompt. `-s read-only`
# guarantees the reviewer cannot edit files — Claude is the only thing that applies
# changes, which is what keeps codex an independent second opinion.

set -euo pipefail

BASE="${1:-main}"
OUT="${2:?output path required}"
REPO="${3:-$(git rev-parse --show-toplevel)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA="$SCRIPT_DIR/../references/review-schema.json"

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found on PATH — install it or check your shell profile" >&2
  exit 127
fi

# Feed the diff to codex directly (via stdin) instead of asking it to run git.
# Codex's read-only sandbox does not reliably allow it to execute git itself, and
# when it can't it returns a useless "I couldn't inspect the diff" non-finding.
# Piping the diff makes every pass deterministic. Codex may still read files in the
# repo for extra context (read-only).
DIFF="$(git -C "$REPO" diff "${BASE}...HEAD")"
if [ -z "$DIFF" ]; then
  printf '{"verdict":"clean","findings":[]}\n' >"$OUT"
  echo "$OUT"
  exit 0
fi

read -r -d '' PROMPT <<PROMPT_EOF || true
You are a strict, independent code reviewer for the korabeland.com repo.
Review ONLY the changes this branch adds on top of the base branch '${BASE}'.
The diff to review (git diff ${BASE}...HEAD) is provided in the <stdin> block
below. You may read other files in the repo purely to understand context.

SCOPE — this is strict: raise findings ONLY about lines that appear in the diff
(added or modified lines). Never report a finding about a file or line that is not
part of the diff. Unchanged code, and files not in the diff, are out of scope even
if you think they could be improved — the working tree may contain unrelated,
uncommitted work that is not yours to review.

Report findings in three categories:
- bug: correctness problems, edge cases, broken or unintended behaviour.
- quality: unclear naming, dead code, weak error handling, missing test coverage.
- simplification: code more complex than it needs to be. Be generous here — this
  repo specifically wants Claude-authored code simplified. Flag redundant branches,
  needless abstraction, and verbose patterns that have a shorter idiomatic form.
  Every simplification MUST preserve behaviour.

For each finding provide category, severity (high|medium|low), file, line (or null),
a concrete description, and a specific suggested_fix.
Set verdict to 'clean' ONLY when there are no material findings, otherwise
'changes_requested'. Return ONLY output matching the provided JSON schema, and do
NOT modify any files.
PROMPT_EOF

# Reasoning effort: `codex exec` defaults to xhigh, which is thorough but slow —
# too slow to run several passes per PR. `medium` keeps the loop practical; override
# with CODEX_EFFORT=high|xhigh for a deeper (slower) pass when it matters.
EFFORT="${CODEX_EFFORT:-medium}"

# stdout is codex's streamed narration (discarded); the schema JSON goes to $OUT.
# The diff is piped in as the <stdin> block referenced by the prompt.
if ! printf '%s' "$DIFF" | codex exec \
      --cd "$REPO" \
      --sandbox read-only \
      -c model_reasoning_effort="$EFFORT" \
      --output-schema "$SCHEMA" \
      -o "$OUT" \
      "$PROMPT" >/dev/null 2>"$OUT.log"; then
  echo "codex exec failed; see $OUT.log" >&2
  tail -8 "$OUT.log" >&2 || true
  exit 1
fi

if ! python3 -c "import json; json.load(open('$OUT'))" 2>/dev/null; then
  echo "codex output at $OUT was not valid JSON (schema not honored?)" >&2
  exit 2
fi

echo "$OUT"
