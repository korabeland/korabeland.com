#!/usr/bin/env bash
# worktree-bootstrap.sh — SessionStart hook (registered in .claude/settings.json).
#
# Installs node_modules once per fresh linked worktree so sessions stop
# re-running `pnpm install --frozen-lockfile` by hand — the chore this removes
# (see docs/plans/2026-07-13-workflow-optimization-plan.md, Finding 1).
#
# Bounded, fail-soft, idempotent contract:
#   - Preconditions (ALL must hold, else exit 0 silently): the project root is a
#     linked worktree under .claude/worktrees/, package.json + pnpm-lock.yaml
#     exist, and node_modules/.modules.yaml is ABSENT (pnpm writes it only on a
#     completed install — the idempotence marker).
#   - Concurrency: per-worktree mutex via `mkdir "$GITDIR/bootstrap.lock"`
#     (mkdir is atomic; a second concurrent session backs off).
#   - Bound: `timeout 180 pnpm install --frozen-lockfile --prefer-offline`,
#     output redirected to "$GITDIR/bootstrap.log".
#   - Failure policy — fail-soft, loud: ALWAYS exit 0 (a broken install must
#     never brick session start). On failure/timeout, print one warning line
#     (SessionStart stdout is injected into the session's context) and delete any
#     partial node_modules/.modules.yaml so an incomplete install can never
#     masquerade as ready.
#
# Progress goes to stderr (shown in the transcript, kept out of context); only
# the failure warning goes to stdout, so a healthy run adds nothing to context.

set -uo pipefail   # deliberately NOT -e: a failed install must not abort the hook

# Resolve the worktree root from this script's own location (.../.claude/hooks/),
# not from cwd or $CLAUDE_PROJECT_DIR — the hook's cwd isn't guaranteed to be the
# worktree root, and CLAUDE_PROJECT_DIR's worktree behaviour is undocumented.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)" || exit 0

# --- Preconditions --------------------------------------------------------
case "$ROOT" in
  */.claude/worktrees/*) ;;                # only bootstrap inside a linked worktree
  *) exit 0 ;;                             # the main clone manages its own deps
esac
[ -f "$ROOT/package.json" ]   || exit 0
[ -f "$ROOT/pnpm-lock.yaml" ] || exit 0
[ -f "$ROOT/node_modules/.modules.yaml" ] && exit 0   # already installed — no-op
command -v pnpm >/dev/null 2>&1 || exit 0             # no pnpm on PATH: leave it to the human

cd "$ROOT" || exit 0
GITDIR="$(git rev-parse --absolute-git-dir 2>/dev/null || echo "$ROOT/.git")"
LOCK="$GITDIR/bootstrap.lock"
LOG="$GITDIR/bootstrap.log"

# --- Concurrency: per-worktree mutex --------------------------------------
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "worktree-bootstrap: install already running in another session — skipping." >&2
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# --- Bounded install ------------------------------------------------------
echo "worktree-bootstrap: installing dependencies (pnpm install --frozen-lockfile)…" >&2
# `timeout` may be absent on a minimal PATH; fall back to an unbounded install
# rather than skipping the feature entirely (Homebrew provides timeout/gtimeout).
TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
if [ -n "$TIMEOUT_BIN" ]; then
  "$TIMEOUT_BIN" 180 pnpm install --frozen-lockfile --prefer-offline >"$LOG" 2>&1
  rc=$?
else
  pnpm install --frozen-lockfile --prefer-offline >"$LOG" 2>&1
  rc=$?
fi

if [ "$rc" -eq 0 ]; then
  echo "worktree-bootstrap: dependencies ready." >&2
  exit 0
fi

# --- Failure: fail-soft, loud (exit 0 regardless) -------------------------
rm -f "$ROOT/node_modules/.modules.yaml" 2>/dev/null || true
echo "WORKTREE BOOTSTRAP FAILED — node_modules is incomplete; run 'pnpm install --frozen-lockfile' manually before dev server/tests. Log: $LOG"
exit 0
