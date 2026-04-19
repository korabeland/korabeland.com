---
description: Show estimated Claude subscription usage — session model, per-model call breakdown, and where to check account-level limits.
---

Report my Claude Code subscription usage status. Do the following steps using the Bash tool:

1. Run `claude --version` to confirm the CLI version.
2. Look for usage or session data in `~/.claude/` (check for logs/, stats/, or usage files): `ls -la ~/.claude/ 2>/dev/null && ls -la ~/.claude/logs/ 2>/dev/null | tail -20`.
3. Count recent `claude -p` invocations in this project's shell history (last 100 lines): `tail -100 ~/.zsh_history 2>/dev/null | grep -c 'claude -p' || echo 0`.

Then output a summary in this format (use "N/A" where data isn't available from the CLI):

```
Claude Code Usage Status
────────────────────────
CLI version:        <version>
Session model:      <current model>

Recent headless calls (this session):
  Haiku  (-p --model haiku):   <count from history or "unknown">
  Sonnet (-p --model sonnet):  <count from history or "unknown">
  Opus   (-p --model opus):    <count from history or "unknown">

Account-level limits:
  Weekly limit remaining: N/A — check https://claude.ai/settings
  Projected depletion:    N/A — check https://claude.ai/settings

Tip: Account-level usage isn't exposed via the CLI. Visit
https://claude.ai/settings to see your Max plan usage dashboard.
```

Replace placeholder values with real data from the Bash tool calls above.
