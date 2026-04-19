# Prompt 4 — Verification stack

**Phase:** 1 (Foundation)
**Depends on:** Prompt 3 complete
**Expected outcome:** The four-layer verification pyramid wired up. Every future agent output passes through `pnpm verify:all` before you see it.

---

## Paste into Claude Code

```
Wire the four-layer verification pyramid now, before any feature work.

Layer 1 — Static checks:
- Biome 2.x for linting and formatting (faster than ESLint+Prettier)
- TypeScript strict mode already on from Prompt 3
- Create pnpm script "verify" that runs: biome check + tsc --noEmit
- Husky pre-commit hook running "pnpm verify"

Layer 2 — Unit tests:
- Vitest 2.x configured for Astro
- One sample test in tests/ that validates a utility function exists
- pnpm script "test" runs vitest with --reporter=json option available

Layer 3 — E2E and visual:
- Playwright 1.56+ installed with the Agents system: run
  `npx playwright init-agents --loop=claude`
- Configure Playwright for screenshots at 375/768/1280/1920 px viewports
- Install pixelmatch and odiff-bin for deterministic pixel comparison
- Create tests/visual/ directory for visual regression baselines
- pnpm script "test:visual" captures screenshots and diffs against baselines
  using pixelmatch (NOT a vision model) as the primary check. Only invoke
  a vision model on the diff region if pixel diff exceeds 0.5% threshold.

Layer 4 — Performance and accessibility:
- @lhci/cli with config: performance ≥ 0.9, accessibility ≥ 0.95,
  LCP ≤ 2500ms, CLS ≤ 0.1
- @axe-core/playwright wired into E2E tests with zero critical/serious
  violations allowed
- pnpm script "audit" runs both

Create pnpm script "verify:all" that runs verify + test + test:visual + audit.
This is the gate every agent output must pass before reaching me.

Commit as "feat: verification stack (biome, vitest, playwright, lighthouse, axe)".
```

---

## Why the pixel-first, vision-second pattern matters

Pixel comparison is deterministic, free, and instant. Vision models are non-deterministic, expensive, and can hallucinate. Use pixelmatch/odiff as the primary gate — they either pass or fail with a clear percentage. Only when pixels disagree do you need a model to describe the semantic change. This reverses the reviewer's instinct to "ask the VL model to compare" and is the single biggest accuracy and cost win in the verification layer.

## What to watch for

- `pnpm verify:all` should be a single command that runs everything
- Husky pre-commit should actually block commits when verify fails (test this by staging a broken file)
- Playwright Agents command (`npx playwright init-agents --loop=claude`) creates `.claude/agents/` files — these are DIFFERENT from the subagents we'll create in Prompt 7; let Claude Code sort out the naming
- Lighthouse thresholds need `.lighthouserc.json` — verify it exists with the numbers from the prompt

## Red flags to push back on

- Using ESLint instead of Biome (slower, more config)
- Visual regression using a vision model as primary (expensive, flaky)
- Missing any of the four layers
- `verify:all` that takes more than 3 minutes — optimize or parallelize

---

**Revised 2026-04-19** — revised Prompt 10 Step 4 layers a MapSurface-specific mirror-sheen audit gate on top of the four-layer pyramid: (a) pixel-stability check (two consecutive Playwright runs diff ≤ 0.01 %), (b) bundle budget (zero net-new client JS from MapSurface, HTML delta ≤ 20 KB gzipped). No changes required to the verify scripts themselves — the additional assertions live alongside them in the Prompt 10 checklist.
