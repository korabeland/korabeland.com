// Single source of truth for the dev-server port the Playwright suite talks to.
//
// Default 4321 (Astro's built-in dev port). Override with DEV_PORT to run the
// whole suite on a non-colliding port when several worktrees share a machine —
// e.g. `DEV_PORT=4399 pnpm test:visual`. See the DEV_PORT contract in
// docs/plans/2026-07-13-workflow-optimization-plan.md (Finding 2).
//
// Consumed by playwright.config.ts (baseURL, both storageState origins, and the
// webServer url/command) and tests/e2e/shift.spec.ts. The tooling scripts don't
// import this (they're .mjs/.sh) — they read DEV_PORT first in their own env
// fallback chain, so the whole repo honours the same override.
export const PORT = Number(process.env.DEV_PORT ?? 4321);
export const ORIGIN = `http://localhost:${PORT}`;
