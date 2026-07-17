import { execFileSync } from "node:child_process";
import type { APIRoute } from "astro";

// Dev-only worktree stamp. Lets the isolation spec confirm the dev server under
// test is serving THIS worktree (its git HEAD), not another worktree's server
// reused on a shared port — the collision the DEV_PORT contract guards against.
// Returns 404 in production; robots.txt disallows /dev/ and the sitemap filter
// excludes it. See docs/plans/2026-07-13-workflow-optimization-plan.md (Finding 2).
export const prerender = false;

export const GET: APIRoute = () => {
  if (import.meta.env.PROD) return new Response("Not found", { status: 404 });

  let head = "unknown";
  let root = "unknown";
  try {
    // execFileSync (no shell) with static args — nothing user-controlled here.
    head = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
  } catch {
    // Leave the "unknown" defaults — the isolation spec fails loudly (a real
    // HEAD never equals "unknown") rather than passing on an unverifiable tree.
  }

  return new Response(JSON.stringify({ head, root }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};
