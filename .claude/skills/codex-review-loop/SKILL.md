---
name: codex-review-loop
description: >-
  Headless OpenAI Codex review-and-simplify loop for korabeland.com, run before
  opening a pull request. Codex acts as an independent, read-only second reviewer
  over the whole branch diff versus main, finding bugs, quality issues, and
  especially simplification opportunities in Claude-authored code; Claude then
  applies the safe fixes, re-runs verify, and re-reviews until codex is clean or a
  risky change needs Korab. ALWAYS use this when finishing a feature branch or
  before creating a PR on this repo (a PreToolUse hook also blocks `gh pr create`
  until it has run). Trigger phrases include "open a PR", "create a PR", "ship
  this", "ready for review", "get it PR-ready", "wrap up this branch", "second
  opinion before the PR", "codex review loop", and "review and simplify the diff".
  Do NOT use it for a one-off codex question or `codex challenge` (that is the
  `codex` skill), simplifying a single function inline (use `simplify`), reviewing
  a plan or requirements doc, debugging, running verify:all alone, or
  merging/commenting on an already-open PR.
---

# Codex Review Loop

## What this is and why it exists

Before a branch becomes a PR, run OpenAI Codex over its diff as an **independent
second opinion**. Codex reviews; Claude applies; Codex re-reviews; repeat until the
diff is clean or something risky needs a human. The goal is not just catching bugs —
it is **simplifying Claude-authored code**, which tends toward more complexity than a
fresh reviewer would accept.

Two properties make this safe to run headless:

- **Codex never edits code.** It runs read-only and only reports findings. Claude is
  the sole author of changes, so the reviewer stays genuinely independent (it does
  not grade its own work).
- **`verify` gates every change.** Nothing converges or opens a PR on a red suite.

This layer is local and pre-PR. It complements, and does not replace, `verify:all`
and the remote Devin Review gate that still runs on the PR.

## Prerequisites (check first)

- **On a feature branch**, not `main`: `git branch --show-current` must not be `main`.
- **There is a diff to review**: `git diff main...HEAD --stat` is non-empty. If empty,
  there is nothing to do.
- **Work is committed.** The loop reviews the committed branch diff and writes a
  marker against HEAD. Commit any in-progress work first, or the marker will not match
  what gets pushed.
- **Codex is authenticated**: `codex login status` reports logged in. If not, ask
  Korab to run `codex login` (do not attempt it headless).

## The loop

Run passes until convergence. Full edge-case rules (verify strategy, cap, stall
detection, marker format) are in `references/loop-details.md` — read it before your
first run.

**1. Review pass.** Run the bundled reviewer over the branch diff:

```bash
.claude/skills/codex-review-loop/scripts/codex-review.sh main /tmp/codex-findings.json
```

It runs `codex exec` read-only and writes JSON: `{ "verdict": "...", "findings": [...] }`,
each finding having `category` (bug|quality|simplification), `severity`, `file`,
`line`, `description`, `suggested_fix`. Read that file.

**2. Converged?** If `verdict` is `clean` (empty `findings`), go to **Finish**.

**3. Triage each finding** against `references/risky-paths.md`:
- **Safe** → apply it.
- **Risky** (protected/SSOT file, or behaviour-changing) → do NOT apply. Add it to
  the escalation list and move on.

**4. Apply the safe findings.** You are the author: apply `suggested_fix` faithfully,
but if a suggestion is wrong or would change behaviour, escalate it instead of
applying it blindly. Codex is a reviewer, not an authority.

**5. Fast gate.** After applying this pass's changes, run the quick checks:

```bash
pnpm verify && pnpm test
```

If red, revert the change responsible (`git checkout -- <file>`), record it under
"Reverted", and escalate that finding. Never leave the tree red.

**6. Commit the pass.** The reviewer only sees committed code (it reviews
`git diff main...HEAD`), so commit the fixes before re-reviewing. Stage ONLY the
files the loop changed (never `git add -A` — unrelated work may be in the tree) and
fold every pass into one commit: first pass `git commit -m "refactor: apply codex
review pass"`, later passes `git commit --amend --no-edit`. See
`references/loop-details.md`.

**7. Re-review.** Go back to step 1 with a fresh pass. Stop early per the cap
(3 passes) and stall detection in `references/loop-details.md`; on stop, treat any
remaining findings as escalations.

## Finish

Do these in order (details in `references/loop-details.md`):

1. **Full gate:** `pnpm verify:all` — must be green to open a PR. If it fails on
   something the fast gate missed (a visual baseline or Lighthouse regression), treat
   the culprit as behaviour-changing: revert and escalate, then re-run.
2. **Write the summary** from `assets/summary-template.md` to
   `docs/reviews/<YYYY-MM-DD>-<branch>-codex-loop.md`, then fold it into the fix
   commit (`git add` that file, `git commit --amend --no-edit`). The applied fixes
   are already committed from step 6; if nothing was applied (clean on first pass),
   there is no fix commit — commit the summary on its own.
3. **Write the marker** to
   `"$(git rev-parse --absolute-git-dir)/codex-review-loop.json"` (schema in
   `loop-details.md`; resolve the git dir with git so it works in a worktree,
   where `.git` is a file) AFTER the final commit, so its `head` matches what
   will be pushed. This is what lets the PR-gate hook pass.
4. **Present escalations to Korab** if any. He decides on those before the PR opens —
   the loop does not apply them.

Then open the PR as usual. Devin reviews it remotely.

## Enforcement

A PreToolUse hook (`scripts/pr-gate.sh`, registered in `.claude/settings.json`)
blocks `gh pr create` unless a fresh marker matches the current HEAD. So if this loop
is skipped, or HEAD moved after it ran, PR creation is refused with a message telling
you to run this skill. Deliberate override: `CODEX_GATE_OFF=1`.

## Files

- `scripts/codex-review.sh` — one read-only codex review pass → findings JSON.
- `scripts/pr-gate.sh` — the PreToolUse hook that enforces the loop before a PR.
- `references/review-schema.json` — the findings JSON schema codex must satisfy.
- `references/risky-paths.md` — the escalation boundary (what must not auto-apply).
- `references/loop-details.md` — verify strategy, cap/stall, revert, marker format.
- `assets/summary-template.md` — the `docs/reviews/` summary format.
