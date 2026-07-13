# Workflow optimization plan — 2026-07-13 (rev 2)

Source: analysis of ~45 Claude Code sessions / 227 MB of transcripts from the last 7 days
(2026-07-06 → 2026-07-13), mining tool errors and repeated command patterns.

Rev 2 addresses the four findings from the Codex adversarial review (2026-07-13):
port propagation contract, safety-preserving reseed, fail-closed review-skip rules,
and a bounded SessionStart bootstrap. All Codex claims were verified against the repo
before revising.

## Findings and proposed fixes

### 1. Worktree bootstrap is re-done by hand in nearly every session

Evidence: 16 sessions ran `pnpm install --frozen-lockfile`; 22 sessions did
`node_modules/.bin` PATH workarounds for husky/lhci/playwright; the "NO node_modules"
probe appears 80+ times.

Fix: a `SessionStart` hook in `.claude/settings.json` calling
`.claude/hooks/worktree-bootstrap.sh` with the following **bounded, fail-soft contract**:

- **Preconditions (all must hold, otherwise exit 0 silently):** cwd is under
  `.claude/worktrees/`, `package.json` and `pnpm-lock.yaml` exist, and
  `node_modules/.modules.yaml` is absent (idempotence marker — pnpm writes it on a
  completed install).
- **Concurrency:** per-worktree mutex via `mkdir "$GITDIR/bootstrap.lock"` (resolved
  with `git rev-parse --absolute-git-dir`, per the worktree-gitdir rule). If the lock
  is held, print "bootstrap already running in another session" and exit 0.
- **Bound:** `timeout 180 pnpm install --frozen-lockfile --prefer-offline`. Output goes
  to `$GITDIR/bootstrap.log`.
- **Failure policy — fail-soft, loud:** the hook always exits 0 (a broken install must
  never brick session start). On failure or timeout it emits a single visible line to
  session context: `WORKTREE BOOTSTRAP FAILED — node_modules is incomplete; run 'pnpm
  install --frozen-lockfile' manually before dev server/tests. Log: <path>`. It also
  removes `node_modules/.modules.yaml` if present so a partial install can never
  masquerade as ready.
- **No lifecycle-script surprise:** the repo's own lockfile is trusted (same command
  every session already runs by hand); no `--ignore-scripts` needed beyond what CI uses.

### 2. Port 4321 collisions between concurrent sessions

Evidence: 59 `lsof` port investigations across 16 sessions; 5 hard `preview_start`
failures. 2–3 concurrent sessions run routinely, so collisions recur by construction.

Verified inventory of hardcoded `4321` consumers:
`playwright.config.ts` (baseURL, two storage origins, webServer.url),
`tests/e2e/shift.spec.ts:142` (storage origin), `.lighthouserc.json` +
`.lighthouserc.mobile.json` (three URLs each), `scripts/generate-pr-description.sh`
(sets PORT=4321 + curl), `scripts/pr-screenshots.mjs` (env-overridable default),
`scripts/static-preview.mjs` (env-overridable default), `.claude/launch.json`.

Fix — a single `DEV_PORT` contract, then autoPort:

- **Contract:** `DEV_PORT` env var, default `4321`. One helper
  (`tests/helpers/port.ts` exporting `PORT` and `ORIGIN`) consumed by
  `playwright.config.ts` (all four sites) and `shift.spec.ts`. Scripts keep their
  existing `process.env.PORT ?? 4321` pattern but read `DEV_PORT` first.
- **Out of scope (CI-only, no collision possible):** both `.lighthouserc*.json` files
  run on fresh CI runners with their own server; they keep literal 4321. Documented in
  the files so nobody "fixes" them.
- **Ordering:** the contract lands and `pnpm verify` + full Playwright suite pass on a
  non-default port (`DEV_PORT=4399 pnpm test:visual`) **before** flipping
  `"autoPort": true` on `korabeland-dev` in `.claude/launch.json`.
- **Isolation check:** one new spec asserts the dev server under test is serving the
  current worktree (compare a build-stamped meta tag / git HEAD) so a green run can
  never come from another worktree's server.

### 3. CI is babysat by manual polling

Evidence: 126 `gh pr checks` + 76 `gh run view` calls + 163 sleep-then-poll loops across
~25 sessions. Several sleep-loops were blocked by the harness or timed out and retried.

Options (policy decision for Korab, unchanged from rev 1):
- Enable GitHub auto-merge on the repo (currently disabled); sessions run
  `gh pr merge --auto` and end their turn.
- Cheaper: AGENTS.md rule — "after pushing, use `gh pr checks --watch` via a background
  task, never sleep-poll."

### 4. codex-review-loop frictions

Evidence: 158 codex invocations across 23 sessions (18 full skill runs).

**4a. `gpt-5.6-luna` pin clobbered by `gstack-upgrade`** (re-applied manually again this
week, 14 commands across 2 sessions). Fix unchanged: an idempotent `re-pin.sh` checked
in next to the skills it patches, invoked automatically at the end of the
`gstack-upgrade` skill run. Lives outside this repo.

**4b. Docs-only branches run the full review loop.** Fix: a short-circuit in the gate
with **fail-closed classification rules**:

- **Allowlist, not denylist.** The loop is skipped only when EVERY changed file matches
  the safe-path allowlist:
  - `docs/**/*.md`
  - `README.md`
  - `*.md` at repo root (CHANGELOG, CONTRIBUTING)
- **Everything else fails closed** — explicitly including `package.json`,
  `pnpm-lock.yaml`, `astro.config.*`, `keystatic.config.*`, `.claude/**`, `.github/**`,
  `src/content/**` (content entries alter routes and builds), `tests/**`, `public/**`,
  and any file type not positively matched. Unknown = full review.
- **Diff-base resolution fails closed:** `git fetch origin main` then
  `git merge-base origin/main HEAD`. If the fetch fails (offline), the ref is missing
  (shallow/detached worktree), the merge-base is empty, or `git diff --name-only`
  itself errors → **run the full review loop**. The skip path requires a successful,
  non-empty classification; every error path falls through to review.
- **Audit line:** when the skip fires, the gate writes the classified file list into the
  review marker so the skip decision is inspectable after the fact.

### 5. Visual-baseline reseeds trip the auto-mode safety classifier

Evidence: reseed work touched 21 sessions; the classifier denied baseline-PNG deletions
3 times, forcing manual approvals.

Rev 2 fix — **no allow-rule, no suppression of the classifier**, per AGENTS.md and
`docs/decisions/2026-07-10-visual-approval-policy.md` (never delete/blind-reseed;
reseed only after visual review of every diff). Replace delete-then-regenerate with a
staged, reviewable, atomic workflow (`scripts/reseed-visual.mjs`, exposed as
`pnpm reseed:visual`):

1. **Generate to a temp dir** (`tests/visual/.reseed-pending/`, gitignored) via
   Playwright `--update-snapshots` pointed at the staging directory. Existing baselines
   are never touched during generation.
2. **Completeness gate:** abort (leaving baselines untouched) if the Playwright run
   exits non-zero or produces fewer PNGs than the current baseline set for the routes
   in scope. Partial output can never be promoted.
3. **Diff report:** emit a per-file report (pixelmatch score + side-by-side paths) for
   every changed baseline. The reviewing agent (or Korab) must look at every diff —
   same standard the AGENTS.md matrix already requires.
4. **Atomic promote:** only after review, `pnpm reseed:visual --promote` moves approved
   PNGs into `tests/visual/baselines/` in one step. Rollback is inherent: baselines are
   git-tracked, and the promote step never runs `rm` on committed files — it overwrites
   via rename, so `git checkout -- tests/visual/baselines` restores any state.
5. **Chromatic stays the blocking gate.** This workflow only maintains the advisory
   local baselines; the ADR's approval flow in CI is unchanged.

Classifier interaction: because nothing is deleted and promotion is an ordinary
tracked-file overwrite after an explicit review step, the "Irreversible Local
Destruction" pattern no longer applies — no permission carve-out needed.

## Smaller observations (no action proposed)

- 47 Edit-before-Read errors across 27 sessions (subagent overhead, not user-fixable).
- Open Brain intermittently down: 10 `net::ERR_FAILED` on capture/search_thoughts while
  global CLAUDE.md mandates `/brain-sync` after every task (36 runs this week). Possible
  health-check/auto-start in the session hook that starts Paperclip.
- Duplicate back-to-back AskUserQuestion calls after interruptions. Minor.

## Suggested implementation order

1. SessionStart worktree-bootstrap hook (self-contained, biggest chore removed)
2. `DEV_PORT` contract → verify on alt port → flip `autoPort: true`
3. `reseed:visual` staged workflow (script + gitignore entry + AGENTS.md pointer)
4. Docs-only fail-closed short-circuit in the codex gate
5. gstack re-pin script (lives outside this repo)
6. Korab's decision: auto-merge vs background `--watch` rule
