---
description: Prune pasted error text to ≤500 tokens, preserving file paths, line numbers, and error messages. Strips node_modules frames, HTML boilerplate, repeated lines.
---

Summarize the following debugging context in ≤500 tokens.

**Preserve:** file paths, line numbers, exact error messages, failing test names.
**Omit:** stack frames from node_modules, HTML boilerplate, repeated log lines, timestamps, process IDs.

Error text:
$ARGUMENTS

If $ARGUMENTS is empty, use the Bash tool to run `pbpaste` and treat the output as the error text.

Output only the pruned summary — no preamble, no labels, just the compressed context.
