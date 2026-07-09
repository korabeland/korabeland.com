# Loop mechanics — details

Read this when running the loop. SKILL.md has the workflow; this file holds the
edge-case rules, the verify strategy, oscillation handling, and the marker format
the PR-gate hook depends on.

## Verify strategy (cost-aware)

`pnpm verify:all` chains Biome + `tsc` + Vitest + Playwright visual + Lighthouse.
Playwright and Lighthouse take minutes; running the full chain on every pass makes
the loop painfully slow. So split it:

- **After each apply (mid-loop):** run the fast gate — `pnpm verify` (Biome + `tsc`)
  then `pnpm test` (Vitest). This catches the overwhelming majority of breakage a
  simplification could introduce (type errors, lint, unit regressions) in seconds.
- **Once, at the end (before writing the marker):** run the full `pnpm verify:all`.
  This is the real gate. The PR must not open unless this is green.

This resolves the requirements doc's open question (full vs subset per pass): fast
subset per pass, full suite once at the end. If the final `verify:all` fails on
something the fast gate missed (a visual baseline shift or a Lighthouse regression
from a codex change), treat the culprit change as behaviour-changing: revert it and
escalate, then re-run `verify:all`.

## Convergence

A pass is **clean** when codex returns `verdict: "clean"` (equivalently, an empty
`findings` array). When that happens, the branch is converged — proceed to the
finish steps.

## Iteration cap and stall detection

Unbounded loops are the main failure mode of headless auto-apply. Bound it:

- **Cap:** at most 3 review→apply→verify passes. On the 4th would-be pass, stop and
  escalate whatever findings remain.
- **Stall / oscillation:** track a fingerprint of each finding (category + file +
  normalised description). Stop early if:
  - a pass produces only findings whose fingerprints already appeared in a previous
    pass (codex keeps asking for the same thing → you are not converging), or
  - the set of changed files starts toggling (a later pass reverts an earlier
    edit's intent).
  On a stall, stop and escalate — do not keep burning passes.

When you stop on cap or stall, that is not a failure to report quietly: list the
unresolved findings in the summary and surface them to Korab exactly like
escalations.

## Applying findings

- Apply only findings that pass the escalation boundary in `risky-paths.md`.
  Everything else is escalated, not applied.
- Apply codex's `suggested_fix` faithfully, but you are the author: if the suggestion
  is wrong or would break behaviour, do not apply it blindly — escalate it instead.
  Codex is an independent reviewer, not an authority.
- Group the applied edits so the fast gate runs once per pass, not once per finding.

## Review scope and committing across passes

`codex-review.sh` reviews the **committed** branch diff — it pipes `git diff BASE...HEAD`
to codex. This is deliberate: it keeps the review scoped to this branch's committed
work and means unrelated, uncommitted working-tree changes (a concurrent session, a
stash you forgot) never leak into the review.

The consequence: fixes you apply live in the working tree, so a re-review would not
see them until they are committed. So after a pass's fixes pass the fast gate,
**commit them before re-reviewing**:

- Stage ONLY the files the loop changed (`git add <those files>`), never `git add -A`
  — the tree may hold unrelated work that must not be swept in.
- Fold every pass into ONE commit: first pass creates `refactor: apply codex review
  pass`; later passes `git commit --amend --no-edit` into it. The result is a single
  clean commit and `BASE...HEAD` always reflects the current state for the next pass.

Because HEAD moves when you amend, (re)write the PR-gate marker only at the very end,
against the final HEAD.

## Reverting

If the fast gate (or final `verify:all`) goes red after a pass, identify the applied
change responsible, `git checkout -- <file>` (or reverse the specific edit) to undo
just that change, record it under "Reverted" in the summary, and escalate the
finding. Never leave the tree red.

## Finish steps (on clean, or on stop-with-escalations)

1. Run the full `pnpm verify:all`. Must be green to open a PR.
2. Write the summary from `assets/summary-template.md` to
   `docs/reviews/<YYYY-MM-DD>-<branch>-codex-loop.md`.
3. Commit the loop's applied fixes as ONE distinct, clearly labelled commit so the
   PR diff stays legible, e.g. `refactor: apply codex review pass`. (If nothing was
   applied — clean on first pass — there is no fix commit.)
4. Write the marker (below) so the PR-gate hook lets `gh pr create` through.
5. If there are escalations, present them to Korab now. He decides before the PR
   opens; the loop does not apply them.

## Marker file (contract with the PR-gate hook)

The hook `scripts/pr-gate.sh` blocks `gh pr create` unless a fresh marker exists.
Write it to `"$(git rev-parse --absolute-git-dir)/codex-review-loop.json"` — the
git dir, so it is per-clone and never committed. Resolve the path with git rather
than hardcoding `.git/`: in a linked worktree `.git` is a *file* (a gitdir
pointer), and the marker belongs in the per-worktree gitdir that
`--absolute-git-dir` returns (it returns `<repo>/.git` for a normal clone):

```json
{
  "branch": "<current branch>",
  "head": "<git rev-parse HEAD>",
  "verdict": "clean" | "stopped",
  "escalations": <count>,
  "timestamp": "<ISO-8601>"
}
```

The marker's `head` must equal the commit that will be pushed. Because the loop's
fix commit changes HEAD, write the marker AFTER that commit. If HEAD later moves
(you add another commit), the marker goes stale and the hook correctly forces
another loop before a PR can open.
