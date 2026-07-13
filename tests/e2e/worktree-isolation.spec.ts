import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// Isolation guard for the DEV_PORT contract (Finding 2). The suite talks to a
// dev server over a port that DEV_PORT selects; with several worktrees on one
// machine, a stale server reused on a shared port could make a green run come
// from the WRONG worktree. The dev-only /dev/worktree-stamp.json route reports
// the served tree's git HEAD — assert it equals this checkout's HEAD, so a
// green suite can never be served by a foreign worktree.
test("dev server under test serves the current worktree", async ({
  request,
}) => {
  const localHead = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  const res = await request.get("/dev/worktree-stamp.json");
  expect(res.ok()).toBeTruthy();

  const body = (await res.json()) as { head: string; root: string };
  expect(body.head).toBe(localHead);
});
