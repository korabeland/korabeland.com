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
# Resolve the git dir rather than assuming `$REPO/.git` is a directory — in a
# linked worktree `.git` is a file (a gitdir pointer), so the marker lives in
# the per-worktree gitdir. `--absolute-git-dir` returns that (and `<repo>/.git`
# for a normal clone), so this works in both.
GITDIR="$(git -C "$REPO" rev-parse --absolute-git-dir 2>/dev/null || echo "$REPO/.git")"
MARKER="$GITDIR/codex-review-loop.json"
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

# Codex-authored branches (a commit carries the codex-build trailer) can't be primarily
# reviewed by codex — that's grading its own homework. Such a branch must be reviewed by
# Claude (code-review-and-quality), which writes the marker with "reviewer":"claude".
# Detection is trailer-parsed (not `--grep`, which matches prose mentions of the trailer)
# and case-insensitive (the repo uses mixed Co-Authored-By / Co-authored-by casing).
# Refresh origin/main first; a stale base ref makes the range wrong. Offline is non-fatal:
# fall back to the origin/main on disk. The trailer contract is defined canonically in
# ~/.claude/skills/codex-build/SKILL.md — this is a copy of the detection line.
git -C "$REPO" fetch --quiet origin main 2>/dev/null || true
CODEX_AUTHORED="$(git -C "$REPO" log origin/main..HEAD \
  --format='%(trailers:key=Co-authored-by,valueonly)' 2>/dev/null \
  | grep -qi 'codex@openai.com' && echo yes || echo no)"
if [ "$CODEX_AUTHORED" = "yes" ]; then
  REVIEWER="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("reviewer",""))' "$MARKER" 2>/dev/null || echo "")"
  [ "$REVIEWER" = "claude" ] || deny "This branch has Codex-authored commits, so Codex cannot be the primary reviewer (marker reviewer='${REVIEWER:-<none>}'). Run the code-review-and-quality (Claude) review, which writes the marker with reviewer=claude, then retry."
fi

exit 0
