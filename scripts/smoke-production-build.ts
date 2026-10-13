#!/usr/bin/env tsx
// Production-build smoke test. CI's Playwright suite runs against `pnpm dev`,
// so the serverless bundle the Vercel adapter actually deploys was never
// exercised before merge (docs/reviews/2026-07-04-console-mvp-launch.md item 8).
// This harness closes that gap: it reads the function's `.vc-config.json`,
// resolves the `handler` it names (relative to the function directory), imports
// that module, and drives its `fetch()` export with web-standard Requests,
// asserting production semantics that a static page or a dev server cannot fake.
//
// Run after `pnpm build` (the entry only exists once the adapter has emitted
// `.vercel/output/`). In CI this runs inside verify-all, reusing the build the
// Lighthouse step already produced.
//
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const functionDir = resolve(repoRoot, ".vercel/output/functions/_render.func");
const configFile = resolve(functionDir, ".vc-config.json");

// Resolve the handler from the emitted metadata rather than hardcoding the
// adapter's internal layout, which has already moved once (Astro 7).
function resolveEntryFile(): string {
  if (!existsSync(configFile)) {
    fail(
      `function metadata not found at ${configFile}\n` +
        "Run `pnpm build` first — this harness tests the Vercel adapter's output.",
    );
  }
  const config: unknown = JSON.parse(readFileSync(configFile, "utf8"));
  const handler =
    typeof config === "object" && config !== null
      ? (config as { handler?: unknown }).handler
      : undefined;
  if (typeof handler !== "string" || handler === "") {
    fail(`${configFile} has no string "handler" — adapter metadata changed.`);
  }
  const entry = resolve(functionDir, handler);
  if (!existsSync(entry)) {
    fail(
      `handler "${handler}" named in ${configFile} does not exist at ${entry}`,
    );
  }
  return entry;
}

function fail(message: string): never {
  console.error(`smoke-production-build: ${message}`);
  process.exit(1);
}

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
    name: "?from=work renders the SSR route",
    path: "/off-trail?from=work",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (!body.includes("case studies: not live yet"))
        return "work subline missing — ?from=work not rendered per-request";
      if (body.includes(SUBLINE))
        return `notes subline "${SUBLINE}" present for ?from=work`;
      return null;
    },
  },
  {
    name: "unknown ?from value falls back to the plain return",
    path: "/off-trail?from=unknown",
    expect: (res, body) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (body.includes("not live yet"))
        return "a subline rendered for an unknown ?from value";
      return null;
    },
  },
  ...[
    "/dev/worktree-stamp.json",
    "/dev/experience-preview",
    "/dev/skills-preview",
    "/dev/gaze-v2-poses",
  ].map(
    (path): Check => ({
      name: "dev-only route is gated out of the production bundle",
      path,
      expect: (res) =>
        res.status === 404 ? null : `expected 404, got ${res.status}`,
    }),
  ),
];

async function main(): Promise<void> {
  const entryFile = resolveEntryFile();
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
