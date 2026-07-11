import { describe, expect, it } from "vitest";
import {
  attenuation,
  bandOuterRadius,
  centerDistance,
  EYE_MANIFEST,
  eyeCenters,
  GAZE,
  gazeOffset,
  halfDiagonal,
  inBand,
  isInside,
  PORTRAIT_VARIANTS,
  type Rect,
  rectCenter,
  shouldSaccade,
  TEMPERAMENT,
  temperamentFor,
  travelPx,
} from "@/lib/portrait-gaze";

// A 340×340 portrait box at (200, 120) — the home hero's rough desktop size.
const RECT: Rect = { left: 200, top: 120, width: 340, height: 340 };
const HALF_DIAG = Math.hypot(340, 340) / 2; // ≈ 240.4

describe("rect helpers", () => {
  it("rectCenter is the box midpoint", () => {
    expect(rectCenter(RECT)).toEqual({ x: 370, y: 290 });
  });

  it("halfDiagonal is half the box diagonal", () => {
    expect(halfDiagonal(RECT)).toBeCloseTo(HALF_DIAG, 4);
  });

  it("bandOuterRadius adds the padding to the half-diagonal", () => {
    expect(bandOuterRadius(RECT)).toBeCloseTo(HALF_DIAG + GAZE.bandPadding, 4);
    expect(bandOuterRadius(RECT, 10)).toBeCloseTo(HALF_DIAG + 10, 4);
  });

  it("centerDistance measures from the box centre", () => {
    expect(centerDistance({ x: 370, y: 290 }, RECT)).toBeCloseTo(0, 6);
    expect(centerDistance({ x: 470, y: 290 }, RECT)).toBeCloseTo(100, 6);
  });
});

describe("isInside (R2 eye-contact trigger)", () => {
  it("is true inside the box and on its edges", () => {
    expect(isInside({ x: 370, y: 290 }, RECT)).toBe(true);
    expect(isInside({ x: 200, y: 120 }, RECT)).toBe(true); // top-left corner
    expect(isInside({ x: 540, y: 460 }, RECT)).toBe(true); // bottom-right corner
  });

  it("is false outside the box", () => {
    expect(isInside({ x: 199, y: 290 }, RECT)).toBe(false);
    expect(isInside({ x: 370, y: 461 }, RECT)).toBe(false);
  });
});

describe("inBand (R1 engage / R4 disengage)", () => {
  const outer = bandOuterRadius(RECT);
  it("engages at or inside the band radius", () => {
    expect(inBand(0, outer)).toBe(true);
    expect(inBand(outer, outer)).toBe(true);
  });
  it("disengages beyond the band radius", () => {
    expect(inBand(outer + 0.01, outer)).toBe(false);
  });
});

describe("attenuation (R1 distance falloff)", () => {
  const outer = bandOuterRadius(RECT);

  it("is full strength at or inside the portrait boundary", () => {
    expect(attenuation(0, HALF_DIAG, outer)).toBe(1);
    expect(attenuation(HALF_DIAG, HALF_DIAG, outer)).toBeCloseTo(1, 6);
    expect(attenuation(HALF_DIAG - 50, HALF_DIAG, outer)).toBe(1);
  });

  it("eases linearly from 1 toward the floor across the band", () => {
    const mid = (HALF_DIAG + outer) / 2;
    expect(attenuation(mid, HALF_DIAG, outer)).toBeCloseTo(
      (1 + GAZE.attenuationFloor) / 2,
      6,
    );
  });

  it("never drops below the floor, even at the band edge", () => {
    expect(attenuation(outer, HALF_DIAG, outer)).toBeCloseTo(
      GAZE.attenuationFloor,
      6,
    );
    expect(attenuation(outer + 100, HALF_DIAG, outer)).toBe(
      GAZE.attenuationFloor,
    );
  });

  it("respects a custom floor", () => {
    expect(attenuation(outer, HALF_DIAG, outer, 0.4)).toBeCloseTo(0.4, 6);
  });
});

describe("travelPx (R8 travel scale)", () => {
  it("scales image width by the travel fraction and temperament", () => {
    expect(travelPx(340, TEMPERAMENT.day)).toBeCloseTo(
      340 * GAZE.travelFraction,
      6,
    );
    expect(travelPx(340, TEMPERAMENT.night)).toBeCloseTo(
      340 * GAZE.travelFraction * TEMPERAMENT.night.travelScale,
      6,
    );
  });

  it("day travels further than night", () => {
    expect(travelPx(340, TEMPERAMENT.day)).toBeGreaterThan(
      travelPx(340, TEMPERAMENT.night),
    );
  });
});

describe("eyeCenters", () => {
  it("resolves manifest fractions against the live rect", () => {
    const eyes = EYE_MANIFEST["portrait-illustrated"];
    const { left, right } = eyeCenters(eyes, RECT);
    expect(left.x).toBeCloseTo(200 + eyes.left.cx * 340, 6);
    expect(left.y).toBeCloseTo(120 + eyes.left.cy * 340, 6);
    expect(right.x).toBeCloseTo(200 + eyes.right.cx * 340, 6);
    // Right eye sits to the right of the left eye.
    expect(right.x).toBeGreaterThan(left.x);
  });
});

describe("gazeOffset (R6 bearing + clamp)", () => {
  const eye = { x: 0, y: 0 };

  it("points toward the cursor at full travel magnitude", () => {
    expect(gazeOffset(eye, { x: 100, y: 0 }, 10)).toEqual({ x: 10, y: 0 });
    expect(gazeOffset(eye, { x: 0, y: 100 }, 10)).toEqual({ x: 0, y: 10 });
  });

  it("clamps a far cursor to the travel radius, preserving direction", () => {
    const off = gazeOffset(eye, { x: 30, y: 40 }, 10); // unit (0.6,0.8)
    expect(off.x).toBeCloseTo(6, 6);
    expect(off.y).toBeCloseTo(8, 6);
    expect(Math.hypot(off.x, off.y)).toBeCloseTo(10, 6);
  });

  it("does not overshoot a cursor nearer than the travel radius", () => {
    const off = gazeOffset(eye, { x: 3, y: 4 }, 10); // len 5 < 10
    expect(off).toEqual({ x: 3, y: 4 });
  });

  it("rests when the cursor is on the eye or travel is zero", () => {
    expect(gazeOffset(eye, { x: 0, y: 0 }, 10)).toEqual({ x: 0, y: 0 });
    expect(gazeOffset(eye, { x: 100, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("shouldSaccade (R6 hold-then-jump)", () => {
  it("holds while the target stays within the threshold", () => {
    expect(shouldSaccade({ x: 0, y: 0 }, { x: 2, y: 0 }, 3)).toBe(false);
    expect(shouldSaccade({ x: 0, y: 0 }, { x: 3, y: 0 }, 3)).toBe(false);
  });

  it("jumps once the target strays past the threshold", () => {
    expect(shouldSaccade({ x: 0, y: 0 }, { x: 4, y: 0 }, 3)).toBe(true);
  });
});

describe("temperamentFor (R8)", () => {
  it("returns the matching parameter set", () => {
    expect(temperamentFor("day")).toBe(TEMPERAMENT.day);
    expect(temperamentFor("night")).toBe(TEMPERAMENT.night);
  });

  it("day is alert (full travel, quicker jump) vs night drowsy", () => {
    expect(TEMPERAMENT.day.travelScale).toBe(1);
    expect(TEMPERAMENT.day.travelScale).toBeGreaterThan(
      TEMPERAMENT.night.travelScale,
    );
    expect(TEMPERAMENT.day.jumpMs).toBeLessThan(TEMPERAMENT.night.jumpMs);
  });
});

describe("EYE_MANIFEST coverage + bounds (R10 / AE6)", () => {
  it("has an entry for every shipped portrait variant", () => {
    // Adding a variant to PORTRAIT_VARIANTS (the render SSOT) without a
    // manifest entry fails here — pupils can't ship misaligned (AE6).
    for (const variant of PORTRAIT_VARIANTS) {
      expect(EYE_MANIFEST[variant.basename], variant.basename).toBeDefined();
    }
  });

  it("has no manifest entries for unshipped variants", () => {
    const shipped = new Set(PORTRAIT_VARIANTS.map((v) => v.basename));
    for (const basename of Object.keys(EYE_MANIFEST)) {
      expect(shipped.has(basename), basename).toBe(true);
    }
  });

  for (const variant of PORTRAIT_VARIANTS) {
    describe(variant.basename, () => {
      const eyes = EYE_MANIFEST[variant.basename];

      it("places both pupils inside the image box", () => {
        for (const eye of [eyes.left, eyes.right]) {
          expect(eye.cx).toBeGreaterThan(0);
          expect(eye.cx).toBeLessThan(1);
          expect(eye.cy).toBeGreaterThan(0);
          expect(eye.cy).toBeLessThan(1);
        }
      });

      it("orders the left eye left of the right eye", () => {
        expect(eyes.left.cx).toBeLessThan(eyes.right.cx);
      });

      it("has a positive pupil radius inside a larger iris clip", () => {
        expect(eyes.pupilRadius).toBeGreaterThan(0);
        expect(eyes.irisRadius).toBeGreaterThan(eyes.pupilRadius);
      });

      it("keeps the pupil inside its clip at full travel (no sclera spill)", () => {
        expect(eyes.pupilRadius + GAZE.travelFraction).toBeLessThanOrEqual(
          eyes.irisRadius,
        );
      });
    });
  }
});
