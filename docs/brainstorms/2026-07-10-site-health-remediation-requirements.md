---
title: "spec: Site health remediation and recurrence prevention"
type: spec
status: proposed
date: 2026-07-10
origin: 2026-07-10 full site audit
---

# Spec: Site Health Remediation and Recurrence Prevention

## Status and decision gate

This is a Phase 1 specification. It is intentionally not an implementation
plan or task list. The owner must approve the open decisions below before
planning or changing application, CI, dependency, or agent-rule files.

## Objective

Bring korabeland.com back to a secure, repeatable release state and make the
same classes of issue hard to reintroduce. The work covers the audit findings:

- high-severity production dependency vulnerabilities;
- a local verification command that fails in a multi-worktree checkout;
- stale and incomplete visual regression coverage;
- an eager 9.7 MB article hero image with no intrinsic dimensions or responsive
  delivery;
- browser, SEO, accessibility, and performance coverage that has not kept pace
  with the projects and posts collections;
- duplicated presentation/state logic that can drift;
- runtime and operational documentation that disagrees with the deployed
  environment; and
- two small UX improvements: more discoverable metric provenance and a more
  focused home-page case-study list.

The target user is both a visitor (fast, clear, accessible portfolio pages)
and a future maintainer or agent (one trustworthy, reproducible path to ship a
change). Success means a normal content or dependency change cannot quietly
bypass the relevant security, performance, visual, or documentation guard.

## Assumptions

1. The remediation remains on the Astro 6 line; this is a compatibility-tested
   patch upgrade, not an Astro 7 migration.
2. The project retains its static-by-default Vercel architecture, its existing
   Keystatic content model, and its no-auto-merge workflow.
3. The separate Watchtower agent-team proposal is out of scope. This work makes
   the existing local and CI workflow reliable first.
4. No existing unrelated working-tree changes are modified or included.
5. Visual review must remain cross-platform; a locally generated pixel baseline
   cannot be treated as a portable truth without an explicit policy.

## Current evidence

| Area | Audit evidence | Consequence |
| --- | --- | --- |
| Security | `pnpm audit --prod` reported 4 high, 5 moderate, and 3 low vulnerabilities. Astro 6.1.7 is below patches for high-severity XSS and SSRF advisories. | A public SSR-capable application is running outdated runtime dependencies. |
| Verification | `pnpm verify` stops in Biome when `.claude/worktrees/*` contains nested `biome.json` files. | The advertised fast gate is not repeatable in the normal multi-worktree environment. |
| Visual QA | `pnpm test:visual` returned 80 passed, 35 failed, and 2 skipped; current screenshot routes omit five of seven case studies. | Local visual signals are noisy and new content has incomplete coverage. |
| Article performance | `public/notes/personal-os-hero.png` is a 2816×1536, 9.7 MB PNG rendered eagerly by a raw image element without width or height. | Visitors can download a needlessly large hero and experience layout movement. |
| Performance scope | Lighthouse checks desktop home and colophon only. | The image-heavy article and mobile routes can regress without detection. |
| Maintainability | The project ledger and day/night portrait patterns are duplicated; shift precedence is maintained in both a TypeScript helper and an inline script. | Future changes have multiple drift points. |
| Operations docs | `.nvmrc`, `.tool-versions`, README, and the actual build/runtime do not agree. | A maintainer can set up or validate the wrong runtime. |

## Scope

### In scope

1. Patch runtime dependencies and make high/critical production audit findings
   a blocking release signal.
2. Restore a deterministic local verification command without reducing what it
   checks.
3. Establish an explicit, enforced visual-review policy and bring baseline and
   route coverage current.
4. Optimise the PersonalOS hero and establish image-delivery requirements for
   future content.
5. Make dynamic content coverage collection-driven rather than a manually
   maintained subset wherever practical.
6. Remove or guard the identified duplication without changing public behavior
   except for the approved UX improvements.
7. Align runtime documentation and add durable agent rules for dependency,
   content-route, image, documentation, and shared-pattern changes.

### Out of scope

- Rewriting portfolio or note copy beyond the approved home-page curation.
- A broad visual redesign, new CMS, or framework migration.
- Replacing Vercel, Keystatic, Playwright, Lighthouse, or Chromatic.
- Building, enabling, or modifying Watchtower automation.
- Automatically merging dependency updates or agent PRs.

## Tech stack and affected structure

- Astro 6, TypeScript strict mode, Tailwind 4, Keystatic, and Vercel remain the
  stack.
- `package.json`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`,
  `.lighthouserc.json`, `.nvmrc`, and `.tool-versions` are orchestrator-only
  changes under `AGENTS.md`.
- Application changes are expected around `src/components/ReadingRoom/`,
  `src/components/CaseStudy/`, `src/components/`, `src/lib/shift.ts`, and the
  home/work routes.
- Content assets live in `src/assets/` or `public/`; authored posts and projects
  live in `src/content/`.
- Unit tests belong in `tests/*.test.ts`; browser, accessibility, SEO, and
  screenshot coverage belongs in `tests/e2e/` and `tests/visual/`.
- The durable rules belong in `AGENTS.md`; a short ADR belongs in
  `docs/decisions/` if the visual-gate or image-delivery policy makes a lasting
  architectural choice.

## Required behaviour

### 1. Dependency security and release gates

- Runtime dependencies must resolve to patched versions for all high and
  critical findings reported by `pnpm audit --prod`.
- CI must run `pnpm audit --prod --audit-level=high` as a distinct step; it must
  not be confused with the existing Lighthouse command named `pnpm run audit`.
- Dependency upgrades must use compatible Astro 6 integration versions and
  pass the complete verification suite.
- A high/critical finding without an available remediation requires a documented
  risk decision, mitigation, owner, and review date before release.

### 2. Deterministic verification and visual policy

- `pnpm verify` must pass in a checkout containing `.claude/worktrees/` and
  must continue to lint, type-check, and Astro-check all intended source files.
- The project must define one authoritative visual approval mechanism:
  committed local baselines, a blocking Chromatic status, or another explicitly
  documented equivalent. The policy must state which platform establishes the
  baseline and how a deliberate visual change is approved.
- A PR that alters a covered page must not silently bypass the selected visual
  gate. The test or service must exercise the changed route.
- Current visual failures must be resolved by reviewing the render and updating
  only approved expectations; deleting a baseline as a pass mechanism is not
  acceptable.

### 3. Content asset delivery and performance coverage

- A post or case-study hero must reserve its rendered aspect ratio with intrinsic
  dimensions (or an equivalent CSS aspect-ratio contract).
- Hero delivery must select an appropriately sized modern image for the visitor
  viewport; a full-resolution source must not be sent by default to a 620 px
  reading column or mobile screen.
- The current PersonalOS hero must no longer be served as the 9.7 MB PNG.
- Lighthouse or an equivalent controlled performance check must cover the
  PersonalOS article and a mobile profile in addition to the existing home and
  colophon checks. Each covered route must meet LCP ≤2.5 s and CLS ≤0.1.
- The approved per-image delivery budget must be documented and mechanically
  checked where feasible.

### 4. Collection-driven quality coverage

- Every published project receives route, metadata/SEO, and serious/critical axe
  coverage.
- Every published post receives route and metadata/SEO coverage; posts with a
  hero also receive the applicable image-layout and performance coverage.
- Coverage must be derived from the actual collection or validated against it so
  adding a content entry cannot leave an untested route by omission.
- The visual route set must include all pages selected by the approved visual
  policy, including the five recently added case studies if full project
  coverage is selected.

### 5. Simplification and approved UX improvements

- The shared project ledger must have one owner for markup, responsive behavior,
  and status presentation; the home and `/work` views may configure it without
  duplicating its implementation.
- The day/night portrait rendering must have one owner for variant markup and
  switching behavior.
- Shift precedence may remain pre-paint and dependency-free, but its policy must
  have one authored source or an automated parity test so the inline script and
  TypeScript logic cannot diverge unnoticed.
- Metric provenance must expose a clear, keyboard-accessible action such as
  “How this was measured”, while retaining native no-JavaScript disclosure.
- The home page must present a deliberately curated featured subset of case
  studies and preserve an obvious path to the full `/work` index.

### 6. Documentation and agent prevention rules

`AGENTS.md` must gain a concise change-trigger matrix:

| Change trigger | Required work | Enforcement |
| --- | --- | --- |
| `package.json` or lockfile | Run the production dependency audit; use security guidance; update compatible integrations together. | Blocking CI audit. |
| `src/content/projects/*` or `src/content/posts/*` | Update or automatically derive route, SEO, axe, and visual coverage. | Collection-coverage test. |
| New/replaced image asset | Use responsive delivery, dimensions, alt text, and the image budget; run relevant performance check. | Asset/layout test and CI performance route. |
| Shared markup/state appears in a second surface | Check for an existing component/helper; document an unavoidable duplicate and add parity coverage. | Code review criterion. |
| Runtime or onboarding document | Update the canonical runtime source and its mirrors in the same change. | Sync test plus review criterion. |
| Visual output changes | Follow the selected approval policy; do not weaken visual checks. | Required visual status. |

- `.nvmrc` is the canonical runtime declaration. `.tool-versions`,
  `package.json#engines`, CI, and README must agree with it or reference it
  instead of repeating a version.
- README must describe the tools actually present in this repository. Retired
  Claude/Houtini instructions must be removed or moved to historical material.
- The existing no-test-weakening rule remains absolute.

## Commands

The finished work must be verifiable with these commands:

```sh
pnpm install --frozen-lockfile
pnpm audit --prod --audit-level=high
pnpm verify
pnpm test
pnpm test:visual
pnpm run audit
pnpm build
```

If the selected visual provider has a separate required command, it must be
added here and to CI rather than treated as an optional dashboard check.

## Code style

Follow existing Astro and TypeScript conventions: typed data at the boundary,
small presentational components, native HTML before client JavaScript, and
tests that assert behaviour rather than a helper’s private implementation.

```ts
// Pure collection-derived route list: one data source drives every relevant check.
const projectRoutes = (await listProjects()).map(({ slug }) => `/work/${slug}`);

for (const route of projectRoutes) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    // Run the existing serious/critical axe assertion here.
  });
}
```

Avoid broad abstractions: extract only the ledger, portrait, and shift contracts
identified above, and keep page-specific copy/layout close to its route.

## Testing strategy

| Concern | Evidence required |
| --- | --- |
| Dependency remediation | Production audit has no high/critical findings; build and complete suite pass after upgrade. |
| Verification scope | `pnpm verify` succeeds with a representative nested worktree fixture or configured exclusion. |
| Visual changes | Approved screenshots/diff from the designated cross-platform gate; all selected routes covered. |
| Collection coverage | Test fails when a published project/post lacks its required route coverage. |
| Image delivery | Test rendered width/height contract and responsive source selection; inspect output payload for the PersonalOS hero. |
| Performance | Desktop and mobile Lighthouse results meet thresholds on home, colophon, and PersonalOS. |
| Simplification | Unit/parity tests protect shift resolution; browser tests cover shared ledger and provenance disclosure. |
| Documentation drift | A sync test confirms all runtime declarations agree; README commands work from a clean install. |

## Boundaries

### Always

- Preserve the complete verification surface; fix failures rather than disabling
  a test, lint rule, or CI check.
- Review screenshots before accepting a visual expectation change.
- Run the production dependency audit for a dependency change.
- Treat public content assets as user-facing performance work, not inert files.
- Keep source-of-truth and mirrored documentation changes in the same commit.

### Ask first

- Major-version framework upgrades, new dependencies, a change to the visual
  provider, CI/branch-protection changes, or a budget that materially affects
  image quality.
- Removing a published case study, post, or existing public route.
- Any redesign beyond the two UX changes named in this specification.

### Never

- Suppress, delete, or auto-reseed a visual baseline merely to make a failing
  check pass.
- Use `--exit-zero-on-changes` as the only PR visual approval mechanism.
- Ship a high/critical production audit finding without the documented exception
  required above.
- Hand-edit generated data, commit generated output, or include unrelated
  working-tree changes.
- Store secrets or deployment credentials in documentation, code, or tests.

## Success criteria

1. `pnpm audit --prod --audit-level=high` exits successfully, and CI blocks a
   later high/critical production finding.
2. `pnpm verify`, `pnpm test`, `pnpm test:visual`, `pnpm run audit`, and
   `pnpm build` all have a defined, passing release path on the supported
   runtime.
3. Every published project and post is covered according to the collection
   policy, and an added fixture without coverage causes a test failure.
4. The PersonalOS note has responsive, dimensioned hero delivery and its mobile
   performance measurement meets the stated Core Web Vitals thresholds.
5. The ledger, portrait, and shift duplication risks are removed or protected by
   automated contracts; metric provenance and home curation satisfy the approved
   UX decision.
6. `AGENTS.md`, runtime declarations, README, and CI are mutually consistent;
   the change-trigger matrix directs agents to the applicable checks.
7. No check was weakened to obtain these results, and all changes are reviewed
   as focused, independently verifiable commits.

## Open questions requiring approval

1. **Visual authority:** Should the required gate be committed macOS baselines,
   blocking Chromatic review, or a different cross-platform mechanism? The
   current local-baseline and non-blocking Chromatic combination is inadequate.
2. **Image budget:** Is a default delivery budget of 200 KB for an above-fold
   image acceptable, with documented exceptions for intentional artwork? The
   budget applies to delivered variants, not necessarily the retained source.
3. **Home curation:** Should the home page show three featured case studies by
   default, or a different count/selection rule? The full `/work` index remains
   available in either case.
4. **Runtime target:** Should Node 24 be made canonical because the Vercel build
   currently selects it, or should the supported Node 22 line remain canonical
   with local tooling aligned to it?
5. **Dependency maintenance:** Should automated dependency-update PRs be added,
   or is a blocking audit plus the proposed Watchtower code-health watcher the
   desired maintenance cadence?

