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

# Docs-only fail-closed short-circuit (Finding 4b). Prints the changed-file list
# and returns 0 ONLY when the diff is non-empty and EVERY changed file matches
# the safe-path allowlist. Any failure — offline fetch, missing ref, empty
# merge-base, diff error, or one unsafe/unknown path — returns 1, so the caller
# denies and the full review runs. The skip requires a positive classification;
# nothing falls open.
docs_only_classify() {
  git -C "$REPO" fetch --quiet origin main 2>/dev/null || return 1
  local base files f
  # Compare against the just-fetched tip via FETCH_HEAD — `git fetch origin main`
  # updates FETCH_HEAD reliably but does not always advance refs/remotes/origin/main,
  # and a stale ref would weaken the fail-closed guarantee.
  base="$(git -C "$REPO" merge-base FETCH_HEAD HEAD 2>/dev/null)" || return 1
  [ -n "$base" ] || return 1
  files="$(git -C "$REPO" diff --name-only "$base" HEAD 2>/dev/null)" || return 1
  [ -n "$files" ] || return 1   # empty diff is not a docs-only skip
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      docs/*.md) ;;                        # docs/**/*.md (case '*' spans '/')
      *.md)                                # root-level *.md only …
        case "$f" in */*) return 1 ;; esac # … a nested */*.md is not safe
        ;;
      *) return 1 ;;                       # anything else → full review
    esac
  done <<EOF
$files
EOF
  printf '%s\n' "$files"
}

# Write a marker so the gate passes without the full loop, recording the skip
# and the classified file list (the audit trail the plan requires).
write_skip_marker() {
  local files="$1" branch ts
  branch="$(git -C "$REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo unknown)"
  python3 -c '
import json, sys
marker, branch, head, ts, files = sys.argv[1:6]
flist = [l for l in files.splitlines() if l.strip()]
with open(marker, "w") as fh:
    json.dump({
        "branch": branch, "head": head, "verdict": "docs-only-skip",
        "escalations": 0, "timestamp": ts,
        "skipped_reason": "docs-only: every changed file matched the safe-path allowlist (docs/**/*.md, root *.md)",
        "classified_files": flist,
    }, fh, indent=2)
    fh.write("\n")
' "$MARKER" "$branch" "$HEAD" "$ts" "$files"
}

# A fresh, matching marker (from the codex loop OR a prior docs-only skip) passes.
if [ -f "$MARKER" ]; then
  MARKED_HEAD="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("head",""))' "$MARKER" 2>/dev/null || echo "")"
  if [ "$MARKED_HEAD" = "$HEAD" ]; then
    # A docs-only-skip marker certifies that NO code changed at this HEAD, so the
    # Codex-authored guard below (about who reviewed the *code*) is moot — accept it
    # unconditionally. Only apply the guard to a real review marker; otherwise a
    # codex-authored docs-only branch would pass on the first gate call (which wrote
    # the skip marker) but be denied on the next (marker has no reviewer=claude).
    VERDICT="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("verdict",""))' "$MARKER" 2>/dev/null || echo "")"
    if [ "$VERDICT" != "docs-only-skip" ]; then
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
    fi
    exit 0
  fi
fi

# No valid marker. Allow a docs-only branch through (fail-closed) and record it;
# otherwise demand the full review loop.
if CLASSIFIED="$(docs_only_classify)"; then
  write_skip_marker "$CLASSIFIED"
  echo "codex-review-loop: docs-only branch — full review auto-skipped; audit marker at $MARKER" >&2
  exit 0
fi

deny "No fresh review marker at $MARKER matches HEAD $HEAD, and the branch is not docs-only."
