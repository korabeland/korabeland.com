import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Three files each declare a Node runtime version, and nothing enforces they
// agree: .nvmrc (nvm), .tool-versions (mise/asdf), and package.json#engines
// (read by Vercel to pick the build image). If they drift, local dev, CI, and
// production can each run a different Node major. This guard fails the moment
// they do. See AGENTS.md §2 / README.md "Getting Started".

function extractNvmrcMajor(): number {
  const raw = readFileSync(resolve(process.cwd(), ".nvmrc"), "utf8").trim();
  // .nvmrc may be a bare major ("22") or a full version ("22.22.3").
  const major = Number.parseInt(raw.split(".")[0], 10);
  if (Number.isNaN(major)) {
    throw new Error(
      `.nvmrc: could not parse a Node major version from "${raw}"`,
    );
  }
  return major;
}

function extractToolVersionsMajor(): number {
  const raw = readFileSync(resolve(process.cwd(), ".tool-versions"), "utf8");
  const line = raw.split("\n").find((l) => l.trim().startsWith("node "));
  if (!line) {
    throw new Error(".tool-versions: no `node` line found");
  }
  const version = line.trim().split(/\s+/)[1];
  const major = Number.parseInt(version.split(".")[0], 10);
  if (Number.isNaN(major)) {
    throw new Error(
      `.tool-versions: could not parse a Node major version from "${line}"`,
    );
  }
  return major;
}

function extractEnginesMajor(): number {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  );
  const range: string | undefined = pkg.engines?.node;
  if (!range) {
    throw new Error("package.json: no `engines.node` field found");
  }
  // Extract the lower-bound major out of a semver range like ">=22 <23".
  const match = range.match(/(\d+)/);
  if (!match) {
    throw new Error(
      `package.json: could not parse a Node major version from engines.node "${range}"`,
    );
  }
  return Number.parseInt(match[1], 10);
}

describe("runtime declarations stay in sync", () => {
  it(".nvmrc, .tool-versions, and package.json#engines agree on the Node major version", () => {
    const nvmrcMajor = extractNvmrcMajor();
    const toolVersionsMajor = extractToolVersionsMajor();
    const enginesMajor = extractEnginesMajor();

    expect(
      toolVersionsMajor,
      `.tool-versions declares node ${toolVersionsMajor}, but .nvmrc declares ${nvmrcMajor}`,
    ).toBe(nvmrcMajor);
    expect(
      enginesMajor,
      `package.json#engines.node declares major ${enginesMajor}, but .nvmrc declares ${nvmrcMajor}`,
    ).toBe(nvmrcMajor);
  });

  it("engines.node's floor satisfies every dependency's own engines requirement", () => {
    // engines.node was tightened to ">=22.12 <23" because astro itself
    // declares ">=22.12.0" — a repo engines range looser than a dependency's
    // lets Node 22.0–22.11 pass our gate and then fail at install/build.
    // Guard the floor against the strictest known dependency requirement.
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    );
    const range: string = pkg.engines.node;
    const floor = range.match(/>=\s*(\d+)(?:\.(\d+))?/);
    if (!floor) throw new Error(`engines.node "${range}" has no >= floor`);
    const [floorMajor, floorMinor] = [
      Number.parseInt(floor[1], 10),
      Number.parseInt(floor[2] ?? "0", 10),
    ];

    const astroEngines: string = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "node_modules/astro/package.json"),
        "utf8",
      ),
    ).engines.node;
    const astroFloor = astroEngines.match(/>=\s*(\d+)(?:\.(\d+))?/);
    if (!astroFloor) return; // astro stopped declaring a floor — nothing to check
    const [astroMajor, astroMinor] = [
      Number.parseInt(astroFloor[1], 10),
      Number.parseInt(astroFloor[2] ?? "0", 10),
    ];

    expect(
      floorMajor > astroMajor ||
        (floorMajor === astroMajor && floorMinor >= astroMinor),
      `package.json engines.node "${range}" permits Node versions below astro's own floor "${astroEngines}" — tighten the repo floor to at least ${astroMajor}.${astroMinor}`,
    ).toBe(true);
  });
});
