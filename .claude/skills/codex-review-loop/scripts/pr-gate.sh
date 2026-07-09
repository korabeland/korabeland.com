#!/usr/bin/env bash
# pr-gate.sh — PreToolUse(Bash) hook.
# Blocks `gh pr create` unless the codex review loop has run against the CURRENT
# commit (a fresh marker in .git/codex-review-loop.json whose head == HEAD).
#
# Reads the hook payload as JSON on stdin. Denies with exit code 2 + a stderr
# reason, which Claude Code feeds back to the agent so it knows to run the loop.
# Anything that is not an actual `gh pr create` invocation passes through (exit 0).
#
# Escape hatch: set CODEX_GATE_OFF=1 in the environment to bypass deliberately.

set -euo pipefail

INPUT="$(cat)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detection lives in a Python helper (a heredoc here would break bash's quote
# tracking inside $(...)). Prints "yes" only for a real `gh pr create` invocation.
IS_PR_CREATE="$(printf '%s' "$INPUT" | python3 "$SCRIPT_DIR/detect-pr-create.py")"

[ "$IS_PR_CREATE" = "yes" ] || exit 0
[ "${CODEX_GATE_OFF:-}" = "1" ] && exit 0

REPO="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MARKER="$REPO/.git/codex-review-loop.json"
HEAD="$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo unknown)"

deny() {
  {
    echo "BLOCKED: the codex review loop has not run against the current commit."
    echo "$1"
    echo "Run the codex-review-loop skill on this branch, let it converge, then retry the PR."
    echo "(Deliberate override: set CODEX_GATE_OFF=1.)"
  } >&2
  exit 2
}

[ -f "$MARKER" ] || deny "No review marker found at $MARKER."

MARKED_HEAD="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("head",""))' "$MARKER" 2>/dev/null || echo "")"
[ "$MARKED_HEAD" = "$HEAD" ] || deny "Marker records $MARKED_HEAD but HEAD is $HEAD — code changed since the last review."

exit 0
