#!/usr/bin/env bash
# pr-gate-test.sh — scenario tests for the Codex-authored self-review guard in
# pr-gate.sh. Builds throwaway repos with synthetic commits + markers and asserts
# the gate's allow/deny decision. Run: bash .../scripts/pr-gate-test.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/pr-gate.sh"
TRAILER='Co-Authored-By: Codex <codex@openai.com>'
PAYLOAD='{"tool_input":{"command":"gh pr create --fill"}}'
PASS=0; FAIL=0
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# run the gate against repo $1 (as CLAUDE_PROJECT_DIR); echo exit code
run_gate() { CLAUDE_PROJECT_DIR="$1" ${2:+env "$2"} bash "$GATE" <<<"$PAYLOAD"; echo $?; }

# write a marker at repo $1's gitdir with head=$1's HEAD and reviewer=$2 (empty=omit)
write_marker() {
  local repo="$1" reviewer="$2"
  local gd; gd="$(git -C "$repo" rev-parse --absolute-git-dir)"
  local head; head="$(git -C "$repo" rev-parse HEAD)"
  if [ -n "$reviewer" ]; then
    printf '{"branch":"b","head":"%s","verdict":"clean","reviewer":"%s","escalations":0,"timestamp":"t"}\n' "$head" "$reviewer" > "$gd/codex-review-loop.json"
  else
    printf '{"branch":"b","head":"%s","verdict":"clean","escalations":0,"timestamp":"t"}\n' "$head" > "$gd/codex-review-loop.json"
  fi
}

# make a repo with an origin/main, on a feature branch; $2 = commit style
#   plain | trailer | trailer-lc | prose
new_repo() {
  local name="$1" style="$2"
  local origin="$TMP/$name-origin.git" repo="$TMP/$name"
  git init -q --bare "$origin"
  git init -q "$repo"; git -C "$repo" config user.email t@e.com; git -C "$repo" config user.name t
  git -C "$repo" commit -q --allow-empty -m init
  git -C "$repo" branch -M main
  git -C "$repo" remote add origin "$origin"
  git -C "$repo" push -q origin main
  git -C "$repo" checkout -q -b feat/x
  echo "x" > "$repo/f.txt"; git -C "$repo" add f.txt
  case "$style" in
    plain)      git -C "$repo" commit -q -m "feat: x" ;;
    trailer)    git -C "$repo" commit -q -m "feat: x" -m "$TRAILER" ;;
    trailer-lc) git -C "$repo" commit -q -m "feat: x" -m "Co-authored-by: codex <codex@openai.com>" ;;
    prose)      git -C "$repo" commit -q -m "docs: mention the trailer" \
                  -m "The build tags commits with Co-Authored-By: Codex <codex@openai.com> for detection." \
                  -m "Signed-off-by: Someone <s@e.com>" ;;
  esac
  echo "$repo"
}

check() { # desc expected_exit actual_exit
  if [ "$2" = "$3" ]; then echo "PASS: $1"; PASS=$((PASS+1)); else echo "FAIL: $1 (expected exit $2, got $3)"; FAIL=$((FAIL+1)); fi
}

# 1. plain branch + reviewer:codex marker -> ALLOW
r="$(new_repo s1 plain)"; write_marker "$r" codex
check "plain branch, reviewer=codex -> allow" 0 "$(run_gate "$r")"

# 2. codex-authored + reviewer:claude marker -> ALLOW
r="$(new_repo s2 trailer)"; write_marker "$r" claude
check "codex-authored, reviewer=claude -> allow" 0 "$(run_gate "$r")"

# 3. codex-authored + reviewer:codex marker -> DENY
r="$(new_repo s3 trailer)"; write_marker "$r" codex
check "codex-authored, reviewer=codex -> deny" 2 "$(run_gate "$r")"

# 4. codex-authored + legacy marker (no reviewer) -> DENY (fail closed)
r="$(new_repo s4 trailer)"; write_marker "$r" ""
check "codex-authored, legacy marker -> deny" 2 "$(run_gate "$r")"

# 5. prose mention of trailer (not a real trailer) + reviewer:codex -> ALLOW (no false positive)
r="$(new_repo s5 prose)"; write_marker "$r" codex
check "prose mention only, reviewer=codex -> allow" 0 "$(run_gate "$r")"

# 6. lowercase-casing real trailer + reviewer:codex -> DENY (case-insensitive detect)
r="$(new_repo s6 trailer-lc)"; write_marker "$r" codex
check "lowercase trailer, reviewer=codex -> deny" 2 "$(run_gate "$r")"

# 7. CODEX_GATE_OFF=1 bypass on a would-deny state -> ALLOW
r="$(new_repo s7 trailer)"; write_marker "$r" codex
check "gate-off bypass -> allow" 0 "$(run_gate "$r" CODEX_GATE_OFF=1)"

# 8. stale marker head (existing behavior preserved) -> DENY
r="$(new_repo s8 plain)"; write_marker "$r" codex
echo y > "$r/g.txt"; git -C "$r" add g.txt; git -C "$r" commit -q -m "feat: y"  # HEAD moves, marker stale
check "stale marker head -> deny" 2 "$(run_gate "$r")"

# 9. linked worktree: marker resolves via absolute-git-dir, codex-authored -> DENY
r="$(new_repo s9 trailer)"
wt="$TMP/s9-wt"; git -C "$r" worktree add -q -b feat/wt "$wt" HEAD
write_marker "$wt" codex   # writes into the per-worktree gitdir
check "worktree, codex-authored, reviewer=codex -> deny" 2 "$(run_gate "$wt")"
git -C "$r" worktree remove --force "$wt" 2>/dev/null || true

echo "----"
echo "pr-gate-test: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
