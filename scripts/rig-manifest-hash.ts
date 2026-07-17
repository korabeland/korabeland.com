// Shared, sharp-free geometry contract for the eye-rig layer set. Both the
// generator (scripts/gen-eye-rig.ts) and its unit tests import these so the
// staleness check compares against exactly the hash the generator stamps —
// edit RIG_MANIFEST or RIG without regenerating and the coverage test fails.
import { createHash } from "node:crypto";
import { RIG, RIG_MANIFEST } from "../src/lib/portrait-gaze";

/** Eye-box size, fraction of image width (HALF 0.06 each side). */
export const RIG_BOX = 0.12;

/** The four layers cut per eye (see gen-eye-rig.ts). */
export const RIG_LAYERS = [
  "underlay",
  "occluder",
  "sprite",
  "highlight",
] as const;

/** A short hash of everything the emitted assets depend on. Stamped into the
 *  meta JSON; a mismatch means the assets trail the SSOT (AE7's spirit). */
export function rigGeometryHash(basename: string): string {
  const payload = JSON.stringify({
    rig: RIG_MANIFEST[basename],
    RIG,
    BOX: RIG_BOX,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
