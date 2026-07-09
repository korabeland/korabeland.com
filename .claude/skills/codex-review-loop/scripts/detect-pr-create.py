#!/usr/bin/env python3
"""Read a PreToolUse hook JSON payload on stdin; print 'yes' if the command is an
actual `gh pr create` invocation, else 'no'.

Quoted spans are stripped first so a mere mention — e.g. an echoed string or
`git commit -m "prep for gh pr create"` — does not count, and the match must sit
at a command boundary (start, or after ; & | && then do)."""

import json
import re
import sys

try:
    cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
except Exception:
    print("no")
    sys.exit(0)

stripped = re.sub(r"""(["']).*?\1""", "", cmd)  # drop quoted spans
norm = re.sub(r"\s+", " ", stripped)
hit = re.search(r"(?:^|[;&|]|&&|\bthen\b|\bdo\b)\s*gh\s+pr\s+create\b", norm)
print("yes" if hit else "no")
