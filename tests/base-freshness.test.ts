import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Hermetic guard test for scripts/check-base-freshness.sh — the pre-commit
// stale-base guard. Builds throwaway git repos (a bare "origin" plus a checkout
// that sits a controlled number of commits behind it) and asserts the guard
// blocks only when the base has drifted past the threshold, and fails soft on
// every environmental problem. No network: "origin" is a local bare repo, so
// the guard's `git fetch origin main` resolves offline. Shaped after
// tests/verify-scope.test.ts (scratch repo + execFileSync + exit-code capture).

const repoRoot = resolve(__dirname, "..");
const guard = resolve(repoRoot, "scripts/check-base-freshness.sh");

// Deterministic identity, isolated from the user's global/system git config so
// the test can't pick up a stray hook or credential helper.
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};

// The guard fail-soft-SKIPS when no `timeout` binary exists (it can't bound the
// fetch), which would make the block-path assertion pass for the wrong reason.
// Present on CI ubuntu and brew-coreutils macOS; skip the block test if absent.
const HAS_TIMEOUT = (() => {
  try {
    execFileSync("bash", ["-c", "command -v timeout || command -v gtimeout"], {
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
})();

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, env: GIT_ENV, stdio: "pipe" });
}

const scratchDirs: string[] = [];

// Build a checkout whose HEAD sits exactly `behind` commits behind origin/main.
function makeScenario(behind: number): { work: string } {
  const dir = mkdtempSync(join(tmpdir(), "base-fresh-"));
  scratchDirs.push(dir);
  const origin = join(dir, "origin.git");
  const pusher = join(dir, "pusher");
  const work = join(dir, "work");

  execFileSync("git", ["init", "--bare", "-b", "main", origin], {
    env: GIT_ENV,
    stdio: "pipe",
  });

  // `pusher` seeds origin/main with the base commit, then later advances it.
  execFileSync("git", ["init", "-b", "main", pusher], {
    env: GIT_ENV,
    stdio: "pipe",
  });
  git(pusher, "remote", "add", "origin", origin);
  writeFileSync(join(pusher, "f.txt"), "0\n");
  git(pusher, "add", "-A");
  git(pusher, "commit", "-m", "c0");
  git(pusher, "push", "-u", "origin", "main");

  // `work` clones origin at the base commit — this is the checkout under test.
  execFileSync("git", ["clone", origin, work], { env: GIT_ENV, stdio: "pipe" });

  // Advance origin/main by `behind` commits WITHOUT touching `work`.
  for (let i = 1; i <= behind; i++) {
    writeFileSync(join(pusher, "f.txt"), `${i}\n`);
    git(pusher, "add", "-A");
    git(pusher, "commit", "-m", `c${i}`);
  }
  if (behind > 0) git(pusher, "push", "origin", "main");

  return { work };
}

function runGuard(
  cwd: string,
  env: Record<string, string> = {},
): { out: string; exitCode: number } {
  try {
    // Merge stderr into stdout (the guard writes all messages to stderr) so a
    // single stream carries both the message and — via the exit code — the verdict.
    const out = execFileSync("bash", ["-c", 'bash "$1" 2>&1', "bash", guard], {
      cwd,
      env: { ...GIT_ENV, ...env },
      encoding: "utf8",
    });
    return { out, exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      out: `${err.stdout ?? ""}${err.stderr ?? ""}`,
      exitCode: err.status ?? 1,
    };
  }
}

afterAll(() => {
  for (const dir of scratchDirs) rmSync(dir, { recursive: true, force: true });
});

describe("check-base-freshness stale-base guard", () => {
  it("passes when the base is within the threshold", () => {
    const { work } = makeScenario(1); // 1 behind, default threshold 10
    const { exitCode } = runGuard(work);
    expect(exitCode).toBe(0);
  });

  it.skipIf(!HAS_TIMEOUT)(
    "blocks when the base is past the threshold, naming remedy and escape hatch",
    () => {
      const { work } = makeScenario(2); // 2 behind, threshold lowered to 1
      const { out, exitCode } = runGuard(work, { STALE_BASE_THRESHOLD: "1" });
      expect(exitCode).toBe(1);
      expect(out).toContain("BLOCKED");
      expect(out).toMatch(/rebase origin\/main/); // remedy
      expect(out).toContain("STALE_BASE_OK"); // escape hatch
    },
  );

  it("passes with the escape hatch even when past the threshold", () => {
    const { work } = makeScenario(2);
    const { out, exitCode } = runGuard(work, {
      STALE_BASE_THRESHOLD: "1",
      STALE_BASE_OK: "1",
    });
    expect(exitCode).toBe(0);
    expect(out).toContain("STALE_BASE_OK=1 set");
  });

  it("treats a non-numeric threshold as misconfiguration and falls back to the default", () => {
    const { work } = makeScenario(1); // 1 behind — within the default 10
    const { out, exitCode } = runGuard(work, { STALE_BASE_THRESHOLD: "abc" });
    // Without the fallback, `[ 1 -le abc ]` errors and the guard would block.
    expect(exitCode).toBe(0);
    expect(out).toContain("using default 10");
  });

  it("fails soft (passes) when origin is unreachable", () => {
    const { work } = makeScenario(2);
    git(work, "remote", "set-url", "origin", join(work, "..", "no-such.git"));
    // Even with an impossible threshold, an unreachable origin must not block.
    const { exitCode } = runGuard(work, { STALE_BASE_THRESHOLD: "0" });
    expect(exitCode).toBe(0);
  });

  it("runs before `pnpm verify` in the pre-commit hook", () => {
    const hook = readFileSync(resolve(repoRoot, ".husky/pre-commit"), "utf8");
    // Guard invoked, chained with && so a block short-circuits before verify.
    expect(hook).toMatch(/check-base-freshness\.sh[\s\S]*&&[\s\S]*pnpm verify/);
    // Ordering on the command lines only — a comment may also mention verify.
    const commands = hook
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n");
    expect(commands.indexOf("check-base-freshness")).toBeLessThan(
      commands.indexOf("pnpm verify"),
    );
  });
});
