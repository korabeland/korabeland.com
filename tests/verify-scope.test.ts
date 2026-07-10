import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Guards the `!.claude/worktrees` exclusion in biome.json: the main checkout
// keeps multiple git worktrees under .claude/worktrees/*, each carrying its
// own committed biome.json. Without the exclusion, `biome check .` from the
// main checkout aborts with "Found a nested root configuration" for every
// worktree. This test builds a hermetic scratch repo shaped like that
// scenario and asserts the exclusion actually suppresses it, without
// broadening scope so far that real violations go unreported.

const repoRoot = resolve(__dirname, "..");
const biomeBin = resolve(repoRoot, "node_modules/.bin/biome");

// Deliberate lint + format violation: unused `var` binding with stray
// semicolons. Triggers lint/correctness/noUnusedVariables plus a formatter
// diagnostic.
const BAD_TS = "var  x = 1 ;;\n";

let scratchDir: string;

function runBiomeCheck(): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync(biomeBin, ["check", "."], {
      cwd: scratchDir,
      encoding: "utf8",
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: `${err.stdout ?? ""}${err.stderr ?? ""}`,
      exitCode: err.status ?? 1,
    };
  }
}

describe("biome.json excludes .claude/worktrees", () => {
  beforeAll(() => {
    scratchDir = mkdtempSync(join(tmpdir(), "biome-worktree-scope-"));

    // Real root config, read at test time so this guard tracks the actual
    // exclusion pattern rather than a hardcoded copy.
    const rootBiomeConfig = readFileSync(
      resolve(repoRoot, "biome.json"),
      "utf8",
    );

    // biome's vcs.useIgnoreFile setting requires a .gitignore to be present.
    writeFileSync(join(scratchDir, ".gitignore"), "");
    writeFileSync(join(scratchDir, "biome.json"), rootBiomeConfig);

    mkdirSync(join(scratchDir, "src"), { recursive: true });
    writeFileSync(join(scratchDir, "src/bad.ts"), BAD_TS);

    // Nested worktree fixture, one level deep, with its own committed
    // biome.json (this is what triggers "nested root configuration" if not
    // excluded).
    mkdirSync(join(scratchDir, ".claude/worktrees/wt-fixture"), {
      recursive: true,
    });
    writeFileSync(
      join(scratchDir, ".claude/worktrees/wt-fixture/biome.json"),
      rootBiomeConfig,
    );
    writeFileSync(
      join(scratchDir, ".claude/worktrees/wt-fixture/bad.ts"),
      BAD_TS,
    );

    // Second nested config two levels deep, to confirm the exclusion isn't
    // just a one-level fluke.
    mkdirSync(join(scratchDir, ".claude/worktrees/wt-fixture/sub"), {
      recursive: true,
    });
    writeFileSync(
      join(scratchDir, ".claude/worktrees/wt-fixture/sub/biome.json"),
      rootBiomeConfig,
    );
    writeFileSync(
      join(scratchDir, ".claude/worktrees/wt-fixture/sub/bad.ts"),
      BAD_TS,
    );
  });

  afterAll(() => {
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it("does not error on nested root configuration under .claude/worktrees", () => {
    const { stdout } = runBiomeCheck();

    expect(stdout).not.toMatch(/nested root configuration/i);
  });

  it("does not report diagnostics for any path under .claude/worktrees", () => {
    const { stdout } = runBiomeCheck();

    expect(stdout).not.toMatch(/\.claude\/worktrees/);
  });

  it("still reports the real violation in src/bad.ts", () => {
    const { stdout, exitCode } = runBiomeCheck();

    expect(exitCode).not.toBe(0);
    expect(stdout).toContain("src/bad.ts");
  });

  it("excludes a nested config two levels deep", () => {
    const { stdout } = runBiomeCheck();

    expect(stdout).not.toMatch(/\.claude\/worktrees\/wt-fixture\/sub/);
  });
});
