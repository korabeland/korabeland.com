# Prompt 6 — Escalation pipeline with headless Claude Code

**Phase:** 2 (Local model plumbing)
**Depends on:** Prompt 5 complete
**Expected outcome:** A clean escalation pipeline using headless `claude -p` calls (your subscription, not API keys). Local models try first, Haiku prunes context before escalation to Sonnet/Opus, usage visibility via `/usage-status`.

---

## Why this prompt changed from v1

The original version used direct Anthropic API calls from Node scripts, which would have required a separate API key and per-token billing. Since you're on a Claude Max subscription, we use **headless Claude Code** (`claude -p`) instead — same authentication as your interactive sessions, counts against your Max weekly limits, no API key needed, no SQLite budget tracking required.

## Paste into Claude Code

```
Implement the escalation pipeline using headless Claude Code (claude -p) so
everything runs through my Max subscription. No direct API calls, no API keys,
no separate billing.

Create scripts/ directory with these shell scripts:

1. scripts/prune-context.sh
   - Reads raw error context from stdin (Playwright trace, DOM dump, stack
     trace, test output)
   - Pipes to: claude -p --model haiku --output-format text
     with the prompt: "Summarize this debugging context in ≤500 tokens.
     Preserve: file paths, line numbers, exact error messages, failing
     test names. Omit: stack frames from node_modules, HTML boilerplate,
     repeated log lines."
   - Outputs pruned summary to stdout
   - Include timeout (30s) and retry (max 2) logic

2. scripts/escalate.sh
   - Takes a failure description as argument or stdin
   - Pipes the raw context through scripts/prune-context.sh first
   - Then invokes: claude -p --model sonnet with the pruned context plus
     a debugging prompt
   - Outputs the diagnosis + proposed fix to stdout
   - For critical cases, supports --model opus flag

3. scripts/commit-message.sh
   - Runs: claude -p --model haiku with `git diff --cached` piped in
   - Prompt: "Write a conventional commit message (type(scope): subject)
     for these changes. Subject ≤50 chars, no period. Body optional."
   - Outputs to stdout, suitable for piping to git commit -F -

4. scripts/rate-limit-guard.sh
   - Wrapper that scripts should source before making claude -p calls
   - Enforces: max 3 retries, 1 second sleep between, exit cleanly on
     repeated failures rather than hammering the subscription limits

All scripts use `set -euo pipefail` and log to stderr so stdout stays clean
for piping.

Update AGENTS.md escalation policy to reference these scripts. The three-strike
rule becomes: local task fails, retry with expanded context, retry once more,
then scripts/escalate.sh gets invoked.

Create .claude/commands/usage-status.md slash command that runs
`claude /usage` (or equivalent) and formats the output to show: weekly
limit remaining, Opus usage, Sonnet usage, Haiku usage, projected depletion
date based on recent activity.

Create .claude/commands/prune.md slash command that takes pasted error
text as argument and runs it through scripts/prune-context.sh, returning
the pruned summary.

Commit as "feat: headless escalation pipeline with subscription-native pruner".
```

---

## What `claude -p` gives us

- **Subscription-native**: uses the same auth as your interactive sessions
- **Weekly limits apply**: counts against Max usage, not API tokens
- **Model selection per call**: `--model haiku` / `sonnet` / `opus`
- **Pipeable**: stdin input, stdout output, composable with other shell tools
- **No key management**: no `ANTHROPIC_API_KEY` env var needed anywhere in the project
- **Tool access**: with `--allowedTools "Read Write Bash"` if scripts need file/command access

## Why we still want a pruner

Even though token costs don't hit your wallet directly, weekly usage limits do. A raw Playwright trace piped to `claude -p --model sonnet` might use 40× more tokens than a pruned version. Over a week of heavy use, this is the difference between hitting your Opus cap on Day 4 vs Day 6.

## What to watch for

- Scripts must exit cleanly on failure (non-zero exit codes so calling agents can detect failure)
- `--output-format json` option worth adding to any script whose output gets parsed by another tool
- Rate limit guard is critical — a runaway loop hitting `claude -p` in a tight loop can burn a week of usage in minutes
- `/usage-status` must work — this is your new dashboard instead of dollar tracking

## Red flags to push back on

- Any mention of `ANTHROPIC_API_KEY` in the generated code — you don't need one
- SQLite budget databases — deleted, not relevant anymore
- Direct `fetch()` or `axios` calls to `api.anthropic.com` — should be `claude -p` instead
- Scripts that don't have rate limiting — one infinite loop can wreck your week

## Test before moving on

Run these three checks:

```bash
# 1. Context pruner works
echo "Error: foo is undefined at src/pages/index.astro:42 (and 500 lines of stack)" | \
  ./scripts/prune-context.sh

# 2. Commit message generator works
echo "test change" > test.txt && git add test.txt
./scripts/commit-message.sh
git reset HEAD test.txt && rm test.txt

# 3. Usage status slash command works
# In Claude Code: /usage-status
```

All three should return useful output in under 10 seconds. If any hang or error, fix before Prompt 7.
