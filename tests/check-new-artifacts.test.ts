import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Hermetic test for scripts/check-new-artifacts.sh. Each case builds a throwaway
// repo with a base commit, adds files on a branch, and runs the guard against it.

const guard = resolve(__dirname, "..", "scripts/check-new-artifacts.sh");

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
};

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, env: GIT_ENV, stdio: "pipe" });
}

const scratch: string[] = [];

// Repo whose `main` already tracks `existing`; `added` land on a branch.
function makeRepo(existing: string[], added: string[], stageOnly = false) {
  const dir = mkdtempSync(join(tmpdir(), "new-artifacts-"));
  scratch.push(dir);
  git(dir, "init", "-b", "main");
  const put = (p: string) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), "x\n");
    git(dir, "add", "-f", p);
  };
  put("README.md");
  for (const p of existing) put(p);
  git(dir, "commit", "-m", "base");
  git(dir, "checkout", "-b", "feature");
  for (const p of added) put(p);
  if (!stageOnly) git(dir, "commit", "-m", "work", "--allow-empty");
  return dir;
}

function run(dir: string, ...args: string[]) {
  const r = spawnSync("bash", [guard, ...args], {
    cwd: dir,
    env: GIT_ENV,
    encoding: "utf8",
  });
  return { code: r.status, err: r.stderr };
}

afterAll(() => {
  for (const d of scratch) rmSync(d, { recursive: true, force: true });
});

describe("check-new-artifacts", () => {
  it.each([
    ["build-archive.log", "build or error log"],
    [".security-live/vercel-global/auth.json", "laboratory capture directory"],
    ["somewhere/auth.json", "CLI profile file"],
  ])(
    "rejects newly added %s and names the safe destination",
    (path, reason) => {
      const r = run(makeRepo([], [path]), "--base", "main");
      expect(r.code).toBe(1);
      expect(r.err).toContain(`REJECTED: ${path} (${reason})`);
      expect(r.err).toContain(
        "Move generated output to the ignored scratch directory",
      );
    },
  );

  it("accepts deliverable files and the frozen analytics fixture", () => {
    const r = run(
      makeRepo(
        [],
        ["src/lib/status.ts", "tests/fixtures/vercel-analytics-collector.js"],
      ),
      "--base",
      "main",
    );
    expect(r.code).toBe(0);
  });

  it("ignores lab files that already exist on the base", () => {
    const dir = makeRepo(["old/legacy.log"], ["src/lib/status.ts"]);
    expect(run(dir, "--base", "main").code).toBe(0);
  });

  it("checks the index in --staged mode", () => {
    const bad = makeRepo([], ["build-archive.log"], true);
    expect(run(bad, "--staged").code).toBe(1);
    const ok = makeRepo([], ["src/lib/status.ts"], true);
    expect(run(ok, "--staged").code).toBe(0);
  });

  it("rejects a rename into a lab path", () => {
    const dir = makeRepo(["notes.txt"], []);
    git(dir, "mv", "notes.txt", "build-archive.log");
    git(dir, "commit", "-m", "rename");
    expect(run(dir, "--base", "main").code).toBe(1);
  });

  it("exits 2 on bad usage", () => {
    expect(run(makeRepo([], []), "--bogus").code).toBe(2);
  });
});
