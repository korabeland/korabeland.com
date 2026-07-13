#!/usr/bin/env bash
# check-base-freshness.sh — pre-commit guard.
#
# Blocks a commit when this checkout's base has drifted more than THRESHOLD
# commits behind origin/main — the recurring "stale worktree" trap where a
# branch quietly sits ~20 PRs behind and work is authored against merged-away
# code (documented in institutional memory: "branch off origin/main
# explicitly"). The trap was enforced nowhere; this guard closes it
# mechanically at commit time.
#
# Contract (mirrors the fail-soft posture of .claude/hooks/worktree-bootstrap.sh
# and the FETCH_HEAD mechanics of .claude/skills/codex-review-loop/scripts/pr-gate.sh):
#   - Bounded network cost: a quiet `git fetch origin main` under a ~5s timeout.
#     This is a new per-commit cost, deliberately accepted and bounded.
#   - Fail-soft: any environmental problem (offline, no remote, no `timeout`
#     binary, not a work tree, no HEAD) WARNS and PASSES (exit 0). The guard
#     only ever blocks for the one condition it exists to catch — a genuinely
#     stale base — so it can never brick the commit path for network reasons.
#   - Drift is measured against the JUST-FETCHED tip via FETCH_HEAD, not the
#     refs/remotes/origin/main tracking ref: `git fetch origin main` updates
#     FETCH_HEAD reliably but does not always advance the tracking ref, and a
#     stale ref would produce a false PASS in exactly the scenario the guard
#     exists to catch (pr-gate.sh documents the same hazard).
#   - Worktree-aware: only plain git commands, which behave identically in a
#     linked worktree (where `.git` is a file, not a directory).
#
# Tunables (env):
#   STALE_BASE_THRESHOLD  — max commits behind origin/main before blocking (default 10)
#   STALE_BASE_OK=1       — escape hatch: warn and pass even when over threshold
#
set -uo pipefail   # deliberately NOT -e: an environmental hiccup must not block the commit

THRESHOLD="${STALE_BASE_THRESHOLD:-10}"
# A non-numeric override is misconfiguration, not a stale base. Honour the
# fail-soft contract and fall back to the default rather than blocking on a
# bash "integer expression expected" error from the comparison below.
case "$THRESHOLD" in
  '' | *[!0-9]*)
    echo "check-base-freshness: STALE_BASE_THRESHOLD='${THRESHOLD}' is not a non-negative integer — using default 10." >&2
    THRESHOLD=10
    ;;
esac

# Escape hatch, checked first so it can rescue a commit even when everything
# below would block.
if [ "${STALE_BASE_OK:-}" = "1" ]; then
  echo "check-base-freshness: STALE_BASE_OK=1 set — skipping the stale-base guard." >&2
  exit 0
fi

# Must be inside a work tree with a resolvable HEAD; anything else is not this
# guard's business.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
git rev-parse --verify --quiet HEAD >/dev/null 2>&1 || exit 0

# Bound the fetch. Absent a timeout binary, honour the bounded contract by
# SKIPPING rather than fetching unbounded (fail-soft) — mirrors worktree-bootstrap.sh.
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
if [ -z "$TIMEOUT_BIN" ]; then
  echo "check-base-freshness: no 'timeout' binary to bound the fetch — skipping the stale-base check." >&2
  exit 0
fi

# Quiet, bounded fetch of origin/main into FETCH_HEAD. Offline / no remote / slow
# network all land here and pass fail-soft.
if ! "$TIMEOUT_BIN" 5 git fetch --quiet origin main 2>/dev/null; then
  echo "check-base-freshness: could not fetch origin/main (offline?) — skipping the stale-base check." >&2
  exit 0
fi

# Commits on origin/main (just fetched) that HEAD does not contain = how far the
# base has drifted behind. Feature commits on HEAD live in the other direction
# (FETCH_HEAD..HEAD) and do not inflate this count.
BEHIND="$(git rev-list --count HEAD..FETCH_HEAD 2>/dev/null || echo "")"
case "$BEHIND" in
  '' | *[!0-9]*)
    echo "check-base-freshness: could not compute drift — skipping the stale-base check." >&2
    exit 0
    ;;
esac

if [ "$BEHIND" -le "$THRESHOLD" ]; then
  exit 0
fi

# Over threshold — the condition the guard exists to catch. Block loudly.
{
  echo "BLOCKED: this checkout's base is ${BEHIND} commits behind origin/main (threshold ${THRESHOLD})."
  echo "Working from a stale base risks re-doing or clobbering already-merged work."
  echo ""
  echo "Fix — bring the base current, then re-commit:"
  echo "  git fetch origin && git rebase origin/main"
  echo "  # …or re-branch from a fresh tip:  git fetch origin && git switch -c <branch> origin/main"
  echo ""
  echo "Deliberate override (you understand the risk):  STALE_BASE_OK=1 git commit …"
  echo "Raise the bar for this repo:                     STALE_BASE_THRESHOLD=<n> git commit …"
} >&2
exit 1
