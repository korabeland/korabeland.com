import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PORTRAIT_VARIANTS } from "@/lib/portrait-gaze";
import { RIG_LAYERS, rigGeometryHash } from "../scripts/rig-manifest-hash";

// The rig assets are gitignored (public/**/*.gen.*) and regenerated on demand;
// the `pretest` hook runs gen:eye-rig so these exist before vitest reads them
// (CI has no committed copy). Deterministic assertions over the emitted meta:
// coverage (AE7), geometry staleness, layer set, byte budget, and rest parity.

const RIG_DIR = resolve(process.cwd(), "public/portrait/rig");
// Full two-variant prefetch set (both eyes × all four layers, single tier). The
// generator reported ~78KB; this ceiling catches gross creep (e.g. re-adding a
// second highlight strategy would roughly double it) while tolerating encoder
// variance. Owner-adjustable — the plan's starting figure was 80KB.
const BYTE_CEILING = 92 * 1024;
// Rest parity is composited from the float layers (no encoder in the loop), so
// it is deterministic; observed 0.10–0.17 /255. This floor catches a geometry
// or retouch regression without flaking.
const REST_PARITY_TOLERANCE = 0.3;

interface RigMeta {
  geometryHash: string;
  box: number;
  layers: string[];
  travelCeiling: number;
  eyes: Record<
    string,
    { boxLeft: number; boxTop: number; boxSize: number; restParity: number }
  >;
  bytes: Record<string, number>;
}

function metaFor(basename: string): RigMeta {
  return JSON.parse(
    readFileSync(resolve(RIG_DIR, `${basename}.rig.gen.meta.json`), "utf8"),
  );
}

describe("eye-rig asset generation (U3 — R14/R16/AE7)", () => {
  it("every shipped variant has a rig meta + all layer files (coverage, AE7)", () => {
    for (const v of PORTRAIT_VARIANTS) {
      const metaPath = resolve(RIG_DIR, `${v.basename}.rig.gen.meta.json`);
      expect(existsSync(metaPath), metaPath).toBe(true);
      const m = metaFor(v.basename);
      for (const eye of ["left", "right"]) {
        for (const layer of RIG_LAYERS) {
          const name = `${v.basename}.${eye}.${layer}.gen.webp`;
          expect(existsSync(resolve(RIG_DIR, name)), name).toBe(true);
          expect(m.bytes[name], name).toBeGreaterThan(0);
        }
      }
    }
  });

  it("meta geometry hash matches the live SSOT (staleness → regenerate)", () => {
    // Edit RIG_MANIFEST or RIG without re-running gen:eye-rig and this fails
    // with the stale variant named — the AE7 spirit for geometry drift.
    for (const v of PORTRAIT_VARIANTS) {
      expect(metaFor(v.basename).geometryHash, v.basename).toBe(
        rigGeometryHash(v.basename),
      );
    }
  });

  it("records the settled four-layer set", () => {
    for (const v of PORTRAIT_VARIANTS) {
      expect(metaFor(v.basename).layers).toEqual([...RIG_LAYERS]);
    }
  });

  it("keeps the full two-variant prefetch set under the byte ceiling (R16)", () => {
    let total = 0;
    for (const v of PORTRAIT_VARIANTS) {
      total += Object.values(metaFor(v.basename).bytes).reduce(
        (a, b) => a + b,
        0,
      );
    }
    expect(total).toBeLessThanOrEqual(BYTE_CEILING);
  });

  it("holds rest parity within tolerance for every eye (R3)", () => {
    for (const v of PORTRAIT_VARIANTS) {
      const m = metaFor(v.basename);
      for (const eye of ["left", "right"]) {
        expect(
          m.eyes[eye].restParity,
          `${v.basename} ${eye}`,
        ).toBeLessThanOrEqual(REST_PARITY_TOLERANCE);
      }
    }
  });
});
