#!/usr/bin/env tsx
// Production-build smoke test. CI's Playwright suite runs against `pnpm dev`,
// so the serverless bundle the Vercel adapter actually deploys was never
// exercised before merge (docs/reviews/2026-07-04-console-mvp-launch.md item 8).
// This harness closes that gap: it imports the built function's entry module —
// the same file named in `.vc-config.json`'s `handler` — and drives it with
// web-standard Requests, asserting production semantics that a static page or
// a dev server cannot fake.
//
// Run after `pnpm build` (the entry only exists once the adapter has emitted
// `.vercel/output/`). In CI this runs inside verify-all, reusing the build the
// Lighthouse step already produced.
//
// Future /api/ask checks (chatbot plan U3) extend the CHECKS table below.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const entryFile = resolve(
  repoRoot,
  ".vercel/output/functions/_render.func/dist/server/entry.mjs",
);

// Any absolute origin works — the handler routes on pathname — but using the
// real site origin keeps redirect/canonical assertions honest if added later.
const ORIGIN = "https://korabeland.com";

// The `?from=notes` subline is the discriminating assertion: its text is
// derived from the query string at request time, so a prerendered page (or a
// route that silently lost `prerender = false`) can never produce it.
const SUBLINE = "field notes: not live yet";

interface Check {
  name: string;
  path: string;
  expect: (res: Response, body: string) => string | null; // failure reason or null
}

const CHECKS: Check[] = [
  {
    name: "SSR route renders with request context",
    path: "/off-trail?from=notes",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("text/html"))
        return `expected text/html, got "${type}"`;
      if (!body.includes("This page does not exist."))
        return "page heading missing from body";
      if (!body.includes(SUBLINE))
        return `query-derived subline "${SUBLINE}" missing — response not rendered per-request`;
      return null;
    },
  },
  {
    name: "same route varies per request (not a cached/static body)",
    path: "/off-trail",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (body.includes(SUBLINE))
        return `subline "${SUBLINE}" present without ?from=notes — responses not request-scoped`;
      return null;
    },
  },
  {
    name: "dev-only route is gated out of the production bundle",
    path: "/dev/worktree-stamp.json",
    expect: (res) =>
      res.status === 404 ? null : `expected 404, got ${res.status}`,
  },
];

async function main(): Promise<void> {
  if (!existsSync(entryFile)) {
    console.error(
      `smoke-production-build: built entry not found at ${entryFile}\n` +
        "Run `pnpm build` first — this harness tests the Vercel adapter's output.",
    );
    process.exit(1);
  }

  const mod = await import(pathToFileURL(entryFile).href);
  const handler: unknown = mod.default;
  if (
    typeof handler !== "object" ||
    handler === null ||
    typeof (handler as { fetch?: unknown }).fetch !== "function"
  ) {
    // The adapter's handler contract changed shape — that is exactly the kind
    // of deploy-breaking drift this smoke exists to catch before merge.
    console.error(
      "smoke-production-build: built entry's default export has no fetch() — " +
        "the Vercel adapter's handler contract changed; update this harness deliberately.",
    );
    process.exit(1);
  }
  const fetchHandler = (
    handler as { fetch: (req: Request) => Promise<Response> }
  ).fetch;

  let failures = 0;
  for (const check of CHECKS) {
    let reason: string | null;
    try {
      const res = await fetchHandler(new Request(`${ORIGIN}${check.path}`));
      const body = await res.text();
      reason = check.expect(res, body);
    } catch (err) {
      reason = `handler threw: ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reason === null) {
      console.log(`  ok    ${check.name} (${check.path})`);
    } else {
      failures += 1;
      console.error(`  FAIL  ${check.name} (${check.path}): ${reason}`);
    }
  }

  if (failures > 0) {
    console.error(
      `smoke-production-build: ${failures}/${CHECKS.length} checks failed.`,
    );
    process.exit(1);
  }
  console.log(`smoke-production-build: all ${CHECKS.length} checks passed.`);
}

// No top-level await: tsx emits CJS for this repo's scripts (same constraint
// as the Playwright specs), so the entry point is a promise chain.
main().catch((err: unknown) => {
  console.error("smoke-production-build: unexpected failure:", err);
  process.exit(1);
});
