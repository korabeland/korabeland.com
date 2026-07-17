# Roadmap

Collected 2026-07-12 from every plan, brainstorm, review, idea note, and open branch across this repo and the parent `Personal_Brand` repo. Every item starts in **backlog** so it can be triaged: promote, park, or drop. Items already shipped (og card, JSON-LD, day/night toggle, console UX R2/R5/R7/R9, the four /work case studies) are excluded.

Statuses used after triage: `backlog` -> `next` | `parked` | `dropped`.

---

## 1. Needs a decision first

| Item | Source | Next step | Status |
|---|---|---|---|
| Portrait gaze rig: PR #33 (v1) is open with verdict "cheap and half baked"; a v2 plan (layered cutout + fixation state machine) sits on unmerged branch `claude/portrait-gaze-v2-requirements-b3cca2` | PR #33; `docs/plans/` on that branch | Korab: close or merge #33, then review the v2 plan's Assumptions section | backlog |
| Watchtower site-maintenance agent team (4 Haiku watchers + 1 fixer on GitHub Actions). Plan is `status: active` but the doc is **untracked in the stale main checkout** and nothing is implemented | `docs/plans/2026-07-09-001-feat-watchtower-agent-team-plan.md` + its brainstorm (both uncommitted) | Commit the plan + brainstorm so they aren't lost; then decide whether to build phase 1 (marketing watcher) | backlog |
| Explorable case study (interactive decision-tree walkthrough) | `Personal_Brand/docs/plans/korabeland-future-features.md` | Korab: pick the featured project (Open Question 1) | backlog |
| Generative visual (ambient hero from live GitHub activity) | same doc | Korab: settle scope/ambition (Open Question 2) | backlog |
| Top-3 business plans doc (drives the case-study cadence below) | `Personal_Brand/docs/plans/2026-07-07-top3-business-plans.md` | Korab: sign off positioning and voice | backlog |

## 2. Content (code already built, waiting on Korab)

| Item | Source | Next step | Status |
|---|---|---|---|
| Populate the experience ledger + skills sections. Collections and components shipped; `src/content/experience/` and `src/content/skills/` don't exist, so the sections render nothing | `docs/plans/2026-07-04-001-feat-experience-ledger-tailored-pages-plan.md` | Korab writes real entries; highest-leverage unshipped item on the site | backlog |
| First real tailored `/for/[slug]` page. Infrastructure works; only the CI-anchor `demo` entry exists | `docs/tailored-pages.md` | Create one when the first real application goes out; then capture learnings in `docs/solutions/` | backlog |
| Blog: three QA-passed outlines awaiting dictation. Agent-org piece ("I Built a Tiny Company to Run My Personal Brand") is the intended first post | `Personal_Brand/content/drafts/2026-04-10-*-outline.md`, `2026-04-11-solo-builder-outline.md` | Korab dictates against the agent-org outline; Draft Writer takes it from there | backlog |
| LinkedIn tune-up draft (headline, About, first post, Featured) | `Personal_Brand/content/drafts/linkedin-tuneup.md` | Korab reviews and applies | backlog |
| Remaining case-study write-ups from the shortlist (6 candidates incl. Keypath enterprise AI, Relocation OS, Life-Project OS) | `Personal_Brand/docs/plans/2026-07-03-business-ideas-shortlist.md` | Triage against the four already live on /work; Keypath one needs confidentiality clearance first | backlog |

## 3. Site features (documented, unbuilt)

| Item | Source | Next step | Status |
|---|---|---|---|
| "Window into Claude Code usage" live-portfolio section (commit visualisations, agent-run stats). Flagged top priority in two separate docs | `Personal_Brand/ideas/wispr-flow-notes.md` (2026-03-28); business shortlist | Brainstorm -> requirements; strongest feature candidate | backlog |
| R8: "Built with AI, decided by me" colophon extension (real repo stats + honest AI-vs-Korab split) | `docs/brainstorms/2026-07-06-ux-enhancement-ideas-requirements.md` | Plan it; colophon already has the build log to hang it on | backlog |
| R6: single-source `/resume` route + print stylesheet (one-page brief) | same brainstorm | Plan; decide print-CSS vs PDF export | backlog |
| R3: 90-second brief toggle on case studies | same brainstorm | Plan if case-study depth becomes a friction signal | backlog |
| R4: requirement-to-evidence map on `/for/` pages | same brainstorm | Only worth building once real `/for/` pages exist | backlog |
| R10: decision forks ("the option not taken") in case-study Field Logs | same brainstorm | Content-first: try it in one case study | backlog |
| Per-audience "Start here" routing page | business shortlist | Sketch after case-study volume grows | backlog |
| Automated distribution pipeline (blog -> LinkedIn/X); manual is acceptable through MVP | `Personal_Brand/STRATEGY.md` | Revisit when publishing cadence is real | backlog |

## 4. Infra, maintenance, small fixes

| Item | Source | Next step | Status |
|---|---|---|---|
| Install the Chromatic GitHub App (owner step); then `--exit-zero-on-changes` becomes legitimate | CI decoupling work (PR #26) | Korab installs the app | backlog |
| Production-build smoke test (Playwright currently exercises `pnpm dev`, not the Vercel build) | `docs/reviews/2026-07-04-console-mvp-launch.md` | Add a minimal `pnpm build && preview` smoke job | backlog |
| `404.astro` missing `noindex` | experience-ledger plan (deliberate deferral) | One-line drive-by fix | backlog |
| Hand-picked `featured` frontmatter flag for home curation (v1 uses ship-date top-3) | site-health remediation plan | Add when date ordering stops matching taste | backlog |
| Periodic manual refresh of the contribution seed JSON | console UX plan deferrals | Add to a maintenance checklist (or fold into Watchtower) | backlog |
| Day-shift visual baselines (currently axe-only) | console UX plan deferrals | Only if day-shift regressions actually occur | backlog |
| Status vocabulary glossary (StatusChip key vs label mapping) | `docs/design/components.md` | Small docs tidy | backlog |
| Shift-log legend wording | shift-log restyle notes | Word it or drop it | backlog |
| Update parent `STRATEGY.md` to record the com-vs-github.io site division | experience-ledger plan follow-up | One-paragraph edit in the parent repo | backlog |
| Housekeeping: main checkout is stale (at PR #23) with untracked docs; console-UX plan frontmatter still says `status: active` though it shipped | this sweep | Pull main, commit the stray docs, flip stale frontmatter to `completed` | backlog |

## 5. Parked (explicitly cut or deferred; triage should confirm they stay parked)

- R1 plotted portrait (pen-plotter hero) — cut as "unnecessary"; research preserved for a future revisit.
- Command palette (⌘K) and self-tailoring console (JD-paste -> live `/for/` page) — rejected 2026-07-06; the latter "could be revisited if the job search runs long".
- "Ask me" site chatbot and press-logo strip — skipped until there are receipts to justify them.
- korabeland.github.io playground — activates only when side-project volume justifies the split.
- Idea-stage inspiration (tree-structured navigation, WebGL shader hero, "Talk to My Site" chat, easter eggs) — `Personal_Brand/design/reddit_inspiration.md` and voice notes.
- Interactive demo concepts from the pre-Astro stack plan (triage simulator, journey map builder, etc.) — predate and diverge from the shipped site.
- Automated dependency-update PRs — blocking `pnpm audit` is the mechanism for now.
- Quarterly Watchtower digest rotation + watcher-prompt tuning — follow-ups inside a plan that itself hasn't started.

---

### Suggested triage order

1. Section 1 decisions (they unblock everything downstream, and two of them are rotting: PR #33 and the uncommitted Watchtower plan).
2. Experience + skills content — built, empty, visitor-visible today.
3. Blog post #1 dictation — the content pipeline is idle waiting for it.
4. Everything else on demand.
