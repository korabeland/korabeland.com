import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// Isolation guard for the DEV_PORT contract (Finding 2). The suite talks to a
// dev server over a port that DEV_PORT selects; with several worktrees on one
// machine, a stale server reused on a shared port could make a green run come
// from the WRONG worktree. The dev-only /dev/worktree-stamp.json route reports
// the served tree's git HEAD and worktree root — assert both equal this
// checkout's, so a green suite can never be served by a foreign worktree.
test("dev server under test serves the current worktree", async ({
  request,
}) => {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  const localHead = git("rev-parse", "HEAD");
  const localRoot = git("rev-parse", "--show-toplevel");

  const res = await request.get("/dev/worktree-stamp.json");
  expect(res.ok()).toBeTruthy();

  const body = (await res.json()) as { head: string; root: string };
  // HEAD alone is insufficient: two linked worktrees can sit at the same commit.
  // Pinning the served worktree root too catches a same-commit foreign server.
  expect(body.head).toBe(localHead);
  expect(body.root).toBe(localRoot);
});
