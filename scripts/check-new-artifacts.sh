#!/usr/bin/env bash
# check-new-artifacts.sh — rejects NEWLY ADDED laboratory files.
#
# Agents have twice committed work files: a Storybook error log holding local
# folder paths, and a `.security-live/` capture directory holding a CLI profile
# path. This guard inspects only paths ADDED relative to a base (the PR base in
# CI, the index in pre-commit), never existing content, and never rewrites
# history. It is not a secret scanner.
#
# Usage:
#   check-new-artifacts.sh --base <ref>   # CI: files added in <ref>...HEAD
#   check-new-artifacts.sh --staged       # pre-commit: files added in the index
#
# Rejected: build/error logs (*.log), laboratory capture directories, and CLI
# profile files (auth.json). Legitimate exception: add the exact path to
# ALLOWED below, in the same PR, with a reason.
set -uo pipefail

# Explicit, narrow exceptions: exact repo-relative paths only, no globs.
ALLOWED=(
  # "tests/fixtures/example.log"  # <- reason
)

mode="${1:-}"
case "$mode" in
  --base)
    base="${2:-}"
    [ -n "$base" ] || { echo "check-new-artifacts: --base needs a ref" >&2; exit 2; }
    added="$(git diff --no-renames --diff-filter=A --name-only "${base}...HEAD")" || exit 2
    ;;
  --staged)
    added="$(git diff --cached --no-renames --diff-filter=A --name-only)" || exit 2
    ;;
  *)
    echo "usage: check-new-artifacts.sh --base <ref> | --staged" >&2
    exit 2
    ;;
esac

is_allowed() {
  local p
  for p in ${ALLOWED[@]+"${ALLOWED[@]}"}; do
    [ "$1" = "$p" ] && return 0
  done
  return 1
}

# Prints the reason a path is rejected, or nothing if it is fine.
reason_for() {
  case "$1" in
    *.log) echo "build or error log" ;;
    .security-live/* | */.security-live/* | .gaze-measure/* | */.gaze-measure/* \
      | .test-browsers/* | */.test-browsers/* | .pnpm-store/* | */.pnpm-store/*)
      echo "laboratory capture directory" ;;
    auth.json | */auth.json) echo "CLI profile file" ;;
  esac
}

bad=0
while IFS= read -r path; do
  [ -n "$path" ] || continue
  reason="$(reason_for "$path")"
  [ -n "$reason" ] || continue
  is_allowed "$path" && continue
  echo "REJECTED: $path ($reason)" >&2
  bad=1
done <<< "$added"

if [ "$bad" -ne 0 ]; then
  {
    echo ""
    echo "Move generated output to the ignored scratch directory (.scratch/); stage only deliverable files."
    echo "Unstage a file with: git rm --cached <path>"
    echo "A genuine fixture exception goes in ALLOWED in scripts/check-new-artifacts.sh, by exact path."
  } >&2
  exit 1
fi
exit 0
