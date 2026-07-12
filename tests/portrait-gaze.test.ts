import { describe, expect, it } from "vitest";
import {
  attenuation,
  bandOuterRadius,
  centerDistance,
  clampDt,
  type Ellipse,
  EYE_MANIFEST,
  eyeCenters,
  GAZE,
  GAZE_TEMPERAMENT,
  type GazeEvent,
  type GazeMachine,
  gazeOffset,
  gazeReduce,
  halfDiagonal,
  inBand,
  inEllipse,
  initGaze,
  isInside,
  launchSaccade,
  microDrift,
  PORTRAIT_VARIANTS,
  poseAt,
  type Rect,
  RIG,
  RIG_MANIFEST,
  reachEnvelopeFraction,
  rectCenter,
  type Saccade,
  shouldSaccade,
  TEMPERAMENT,
  temperamentFor,
  travelPx,
  vergedOffsets,
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

describe("RIG_MANIFEST rig geometry (U2 — R15/R8/R4/R13)", () => {
  // Worst-case reach the geometry must accommodate: the day travel ceiling
  // (full attenuation, travelScale 1) plus the vergence margin. Both eyes at
  // this reach must stay inside the face zone (the M1 invariant), so a
  // too-tight zone cannot reintroduce the degenerate-bearing case.
  const maxReach = RIG.travelCeiling + RIG.vergenceMargin;

  it("has a rig entry for every shipped portrait variant", () => {
    for (const variant of PORTRAIT_VARIANTS) {
      expect(RIG_MANIFEST[variant.basename], variant.basename).toBeDefined();
    }
  });

  it("has no rig entries for unshipped variants", () => {
    const shipped = new Set(PORTRAIT_VARIANTS.map((v) => v.basename));
    for (const basename of Object.keys(RIG_MANIFEST)) {
      expect(shipped.has(basename), basename).toBe(true);
    }
  });

  it("travel ceiling is the Korab-tuned value and positive", () => {
    // A guard against an accidental edit dropping travel to zero (rig frozen)
    // or ballooning it past the painted iris.
    expect(RIG.travelCeiling).toBeGreaterThan(0);
    expect(RIG.travelCeiling).toBeLessThan(0.02);
  });

  for (const variant of PORTRAIT_VARIANTS) {
    describe(variant.basename, () => {
      const rig = RIG_MANIFEST[variant.basename];
      const eyes = [rig.left, rig.right] as const;

      it("places both iris discs inside the image box", () => {
        for (const eye of eyes) {
          expect(eye.cx).toBeGreaterThan(0);
          expect(eye.cx).toBeLessThan(1);
          expect(eye.cy).toBeGreaterThan(0);
          expect(eye.cy).toBeLessThan(1);
          expect(eye.irisR).toBeGreaterThan(0);
        }
      });

      it("orders the left iris left of the right iris", () => {
        expect(rig.left.cx).toBeLessThan(rig.right.cx);
      });

      it("seats each iris centre inside its own lid aperture", () => {
        for (const eye of eyes) {
          expect(inEllipse(eye.cx, eye.cy, eye.aperture)).toBe(true);
        }
      });

      it("contains both iris centres + the full travel/vergence envelope in the face zone (M1)", () => {
        // Every reachable pose of both eyes (centre pushed by maxReach in any
        // direction) stays inside the face zone — the invariant that keeps the
        // zone from being traced too tight.
        for (const eye of eyes) {
          for (const [sx, sy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [0.71, 0.71],
            [-0.71, 0.71],
            [0.71, -0.71],
            [-0.71, -0.71],
          ] as const) {
            const px = eye.cx + sx * maxReach;
            const py = eye.cy + sy * maxReach;
            expect(
              inEllipse(px, py, rig.faceZone),
              `${variant.basename} reach (${sx},${sy})`,
            ).toBe(true);
          }
        }
      });

      it("nests the hysteresis enter-boundary strictly inside the exit-boundary", () => {
        const h = rig.faceZoneHysteresis;
        expect(h).toBeGreaterThan(0);
        expect(h).toBeLessThan(1);
        const scale = (e: Ellipse, k: number): Ellipse => ({
          cx: e.cx,
          cy: e.cy,
          rx: e.rx * k,
          ry: e.ry * k,
        });
        const inner = scale(rig.faceZone, 1 - h);
        const outer = scale(rig.faceZone, 1 + h);
        // A point exactly on the inner boundary's x-extreme is inside the outer.
        const p = inner.cx + inner.rx;
        expect(inEllipse(p, inner.cy, outer)).toBe(true);
        // ...and a point just past the outer boundary is outside it.
        expect(inEllipse(outer.cx + outer.rx + 1e-6, outer.cy, outer)).toBe(
          false,
        );
      });
    });
  }
});

describe("gaze fixation state machine (U5 — R6/R7/R8/R9/R11)", () => {
  const day = GAZE_TEMPERAMENT.day;
  const night = GAZE_TEMPERAMENT.night;

  // Reach ENGAGED at rest: gate passes → LOADING → decoded → CONTACT.
  const engaged = (): GazeMachine =>
    gazeReduce(initGaze(true), { type: "decoded" }, day);

  const ptr = (
    x: number,
    y: number,
    t: number,
    o: Partial<
      Pick<
        Extract<GazeEvent, { type: "pointer" }>,
        "inBand" | "inZoneEnter" | "inZoneExit"
      >
    > = {},
  ): GazeEvent => ({
    type: "pointer",
    x,
    y,
    t,
    inBand: o.inBand ?? true,
    inZoneEnter: o.inZoneEnter ?? false,
    inZoneExit: o.inZoneExit ?? false,
  });

  const run = (m: GazeMachine, events: GazeEvent[], temp = day): GazeMachine =>
    events.reduce((s, e) => gazeReduce(s, e, temp), m);

  // Feed still samples at `spot` at `step` intervals until the window is full.
  const holdStill = (
    from: number,
    spot: [number, number],
    steps: number,
    step = 60,
    o = {},
  ): GazeEvent[] =>
    Array.from({ length: steps }, (_, i) =>
      ptr(spot[0], spot[1], from + i * step, o),
    );

  describe("lifecycle + gate (R11)", () => {
    it("a failed gate is terminal GATED_OFF and fetches nothing (AE5)", () => {
      const m = initGaze(false);
      expect(m.state).toBe("GATED_OFF");
      // terminal: no event revives it
      expect(gazeReduce(m, { type: "decoded" }, day).state).toBe("GATED_OFF");
      expect(run(m, [ptr(400, 100, 0), ptr(600, 100, 20)]).state).toBe(
        "GATED_OFF",
      );
    });

    it("passes gate → LOADING, reveals at rest on decode (CONTACT)", () => {
      const loading = initGaze(true);
      expect(loading.state).toBe("LOADING");
      const m = gazeReduce(loading, { type: "decoded" }, day);
      expect(m.state).toBe("CONTACT");
      expect(m.target).toBeNull();
      expect(m.snap).toBe(false); // reveal is a settle at rest, not a snap
    });

    it("any decode failure is atomic, permanent DORMANT (AE8)", () => {
      const m = gazeReduce(initGaze(true), { type: "decodeFailed" }, day);
      expect(m.state).toBe("DORMANT");
      // terminal
      expect(run(m, [ptr(400, 100, 0), ptr(600, 100, 20)]).state).toBe(
        "DORMANT",
      );
    });

    it("ignores pointers before the reveal (still LOADING)", () => {
      const m = run(initGaze(true), [ptr(400, 100, 0), ptr(600, 100, 20)]);
      expect(m.state).toBe("LOADING");
    });
  });

  describe("tracking + contact (R6/R7 — AE1/AE2)", () => {
    it("a moving cursor outside the face zone → TRACKING toward the cursor (AE1)", () => {
      const m = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      expect(m.state).toBe("TRACKING");
      expect(m.target).toEqual({ x: 500, y: 100 });
    });

    it("a classified fixation (still window) → CONTACT, no idle timer (AE2)", () => {
      // move to tracking, then hold still long enough for the move samples to
      // age out of the window and the dispersion to read a pause.
      const start = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      expect(start.state).toBe("TRACKING");
      const paused = run(start, holdStill(80, [500, 100], 10, 60)); // 80..620ms
      expect(paused.state).toBe("CONTACT");
      expect(paused.target).toBeNull();
    });

    it("the fixation window is the ONLY pause mechanism — a short still spell does not settle", () => {
      const start = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      // hold still for less than the window (day window 350ms): 20..200ms
      const brief = run(start, holdStill(60, [500, 100], 3, 60)); // 60,120,180
      expect(brief.state).toBe("TRACKING");
    });
  });

  describe("face zone (R8 — AE3)", () => {
    it("committed face-zone entry (dwell satisfied) → CONTACT", () => {
      const start = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      expect(start.state).toBe("TRACKING");
      // inside the enter-boundary, held past the day dwell (120ms) while moving
      // enough that dispersion never classifies — proves it's the zone, not a pause.
      const m = run(start, [
        ptr(300, 200, 60, { inZoneEnter: true, inZoneExit: true }),
        ptr(305, 205, 140, { inZoneEnter: true, inZoneExit: true }),
        ptr(300, 200, 200, { inZoneEnter: true, inZoneExit: true }),
      ]);
      expect(m.state).toBe("CONTACT");
    });

    it("grazing the enter-boundary (oscillation faster than dwell) commits nothing", () => {
      let m = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      // flip in/out of the enter-boundary every 40ms (< 120ms dwell)
      for (let i = 0; i < 8; i++) {
        m = gazeReduce(
          m,
          ptr(300 + i, 200, 60 + i * 40, {
            inZoneEnter: i % 2 === 0,
            inZoneExit: true,
          }),
          day,
        );
      }
      expect(m.state).toBe("TRACKING"); // never dwelled long enough to commit
    });

    it("holds CONTACT while inside the exit-boundary even on fast motion (hysteresis)", () => {
      // reach contact via the zone, then move fast but stay within the outer
      // boundary — must NOT pop back to tracking until the cursor clears it.
      const contact = run(engaged(), [
        ptr(100, 100, 0),
        ptr(500, 100, 20),
        ...[60, 140, 220].map((t) =>
          ptr(300, 200, t, { inZoneEnter: true, inZoneExit: true }),
        ),
      ]);
      expect(contact.state).toBe("CONTACT");
      const stillContact = gazeReduce(
        contact,
        ptr(360, 260, 260, { inZoneEnter: false, inZoneExit: true }),
        day,
      );
      expect(stillContact.state).toBe("CONTACT");
      // clears the outer boundary while moving fast → tracking
      const tracking = run(stillContact, [
        ptr(700, 400, 280, { inZoneExit: false }),
        ptr(760, 440, 296, { inZoneExit: false }),
      ]);
      expect(tracking.state).toBe("TRACKING");
    });
  });

  describe("resets (R9/R12) — rest-saccade vs snap", () => {
    it("pointer-leave launches a rest saccade (not a snap)", () => {
      const tracking = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      const m = gazeReduce(tracking, { type: "leave" }, day);
      expect(m.state).toBe("CONTACT");
      expect(m.target).toBeNull();
      expect(m.snap).toBe(false);
      expect(m.samples).toHaveLength(0);
    });

    it("band-exit (pointer outside the band) rests via saccade", () => {
      const tracking = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      const m = gazeReduce(
        tracking,
        ptr(9999, 9999, 40, { inBand: false }),
        day,
      );
      expect(m.state).toBe("CONTACT");
      expect(m.snap).toBe(false);
    });

    it("blur / tab hidden / shift toggle snap instantly", () => {
      const tracking = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      const m = gazeReduce(tracking, { type: "interrupt" }, day);
      expect(m.state).toBe("CONTACT");
      expect(m.snap).toBe(true);
    });

    it("a reduced-motion flip is terminal GATED_OFF from any engaged state", () => {
      const tracking = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      const off = gazeReduce(tracking, { type: "reducedMotion" }, day);
      expect(off.state).toBe("GATED_OFF");
      // does not re-arm on further pointers (disarm-only, terminal)
      expect(run(off, [ptr(100, 100, 100), ptr(500, 100, 120)]).state).toBe(
        "GATED_OFF",
      );
    });

    it("re-entering right after a leave restarts cleanly", () => {
      const left = gazeReduce(
        run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]),
        { type: "leave" },
        day,
      );
      const back = run(left, [ptr(100, 100, 100), ptr(500, 100, 120)]);
      expect(back.state).toBe("TRACKING");
      expect(back.target).toEqual({ x: 500, y: 100 });
    });
  });

  describe("edge cases", () => {
    it("drag–pause–drag ping-pongs at most once per genuine pause", () => {
      let m = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      expect(m.state).toBe("TRACKING");
      m = run(m, holdStill(80, [500, 100], 10, 60)); // pause → CONTACT
      expect(m.state).toBe("CONTACT");
      // resume dragging → back to TRACKING exactly once
      m = run(m, [ptr(520, 100, 700), ptr(900, 100, 720)]);
      expect(m.state).toBe("TRACKING");
    });

    it("a stationary cursor during scroll still classifies a fixation (viewport frame)", () => {
      // The component re-dispatches pointers with the same viewport x,y as the
      // portrait scrolls under the cursor; dispersion (viewport) reads a pause.
      const start = run(engaged(), [ptr(100, 100, 0), ptr(500, 100, 20)]);
      const scrolled = run(start, holdStill(80, [500, 100], 10, 60));
      expect(scrolled.state).toBe("CONTACT");
    });

    it("tolerates a window that isn't fillable yet (fast sparse entry)", () => {
      // first sample already deep inside, then one big fast move: legal
      // rest→large-saccade without a false fixation from sparse samples.
      const m = run(engaged(), [ptr(500, 300, 0), ptr(120, 90, 12)]);
      expect(m.state).toBe("TRACKING");
      expect(m.target).toEqual({ x: 120, y: 90 });
    });
  });

  describe("temperament is data, not code paths (R8)", () => {
    it("night reaches the same states as day, just on a longer window", () => {
      const trace: GazeEvent[] = [ptr(100, 100, 0), ptr(500, 100, 20)];
      expect(run(engaged(), trace, night).state).toBe("TRACKING");
      // a pause that settles under day's 350ms window is still tracking under
      // night's 650ms window — same graph, different timing.
      const dayPause = run(
        run(engaged(), trace, day),
        holdStill(60, [500, 100], 7, 60),
        day,
      );
      const nightPause = run(
        run(engaged(), trace, night),
        holdStill(60, [500, 100], 7, 60),
        night,
      );
      expect(dayPause.state).toBe("CONTACT");
      expect(nightPause.state).toBe("TRACKING");
      // ...but night settles too once its longer window fills.
      const nightSettled = run(
        run(engaged(), trace, night),
        holdStill(60, [500, 100], 16, 60),
        night,
      );
      expect(nightSettled.state).toBe("CONTACT");
    });
  });
});

describe("main-sequence motion + vergence (U6 — R10/R12/R13/R17)", () => {
  const day = GAZE_TEMPERAMENT.day;
  const REF = 10; // full-travel reference px for overshoot gating

  describe("saccade profile (R12)", () => {
    it("duration grows monotonically with amplitude", () => {
      const durs = [1, 4, 8, 16].map(
        (amp) =>
          launchSaccade({ x: 0, y: 0 }, { x: amp, y: 0 }, 0, day, REF).dur,
      );
      for (let i = 1; i < durs.length; i++) {
        expect(durs[i]).toBeGreaterThan(durs[i - 1]);
      }
    });

    it("small saccades have no overshoot and never pass the target", () => {
      const s = launchSaccade({ x: 0, y: 0 }, { x: 2, y: 0 }, 0, day, REF); // 2 < 0.4×10
      expect(s.overshoot).toBe(0);
      expect(s.settle).toBe(0);
      const mid = poseAt(s, s.t0 + s.dur / 2);
      expect(mid.x).toBeGreaterThan(0);
      expect(mid.x).toBeLessThanOrEqual(2);
      expect(poseAt(s, s.t0 + s.dur).x).toBeCloseTo(2, 6);
    });

    it("large saccades overshoot then settle to the exact target", () => {
      const s = launchSaccade({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, day, REF);
      expect(s.overshoot).toBeGreaterThan(0);
      // at the end of the main phase the pose is past the target (overshoot)
      expect(poseAt(s, s.t0 + s.dur).x).toBeGreaterThan(10);
      // still settling back mid-settle, then lands exactly on target
      expect(poseAt(s, s.t0 + s.dur + s.settle / 2).x).toBeGreaterThan(10);
      expect(poseAt(s, s.t0 + s.dur + s.settle)).toEqual({ x: 10, y: 0 });
      expect(poseAt(s, s.t0 + s.dur + s.settle + 999)).toEqual({ x: 10, y: 0 });
    });

    it("holds the origin before launch", () => {
      const s = launchSaccade({ x: 1, y: 2 }, { x: 9, y: 0 }, 100, day, REF);
      expect(poseAt(s, 50)).toEqual({ x: 1, y: 2 });
    });
  });

  describe("retarget-on-interrupt (R12 / Assumption C1)", () => {
    it("is continuous through a mid-flight retarget and lands on the new target", () => {
      const s1 = launchSaccade({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, day, REF);
      const now = 20;
      const current = poseAt(s1, now);
      const s2 = launchSaccade(current, { x: 0, y: 10 }, now, day, REF);
      // no teleport: the relaunched saccade starts exactly where we were
      expect(poseAt(s2, now)).toEqual(current);
      // and it converges on the new target
      expect(poseAt(s2, now + s2.dur + s2.settle + 1)).toEqual({ x: 0, y: 10 });
    });

    it("chained per-frame retargets stay bounded and converge once input stops", () => {
      const bound = REF * (1 + day.overshoot * (2 + day.overshoot)) + 1e-6;
      let s: Saccade = launchSaccade(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        0,
        day,
        REF,
      );
      let t = 0;
      // pathological: retarget every frame to an alternating extreme
      for (let i = 0; i < 40; i++) {
        t += 16;
        const cur = poseAt(s, t);
        expect(Math.hypot(cur.x, cur.y)).toBeLessThanOrEqual(bound);
        const tgt = i % 2 === 0 ? { x: -10, y: 0 } : { x: 10, y: 0 };
        s = launchSaccade(cur, tgt, t, day, REF);
      }
      // input stops → converges on the final target
      const settled = poseAt(s, t + s.dur + s.settle + 1000);
      expect(settled.x).toBeCloseTo(s.to.x, 6);
      expect(settled.y).toBeCloseTo(s.to.y, 6);
    });
  });

  describe("micro-drift (R12) + Δt clamp", () => {
    it("stays within its sub-pixel bound at every sampled t", () => {
      for (let t = 0; t < 5000; t += 37) {
        const d = microDrift(t, day, false);
        expect(Math.abs(d.x)).toBeLessThanOrEqual(day.microDriftPx + 1e-9);
        expect(Math.abs(d.y)).toBeLessThanOrEqual(day.microDriftPx + 1e-9);
      }
    });

    it("is exactly zero when frozen (pinned/compared poses)", () => {
      for (let t = 0; t < 1000; t += 53) {
        expect(microDrift(t, day, true)).toEqual({ x: 0, y: 0 });
      }
    });

    it("clamps a giant frame gap to the ceiling, never a teleport past target", () => {
      expect(clampDt(5000, 64)).toBe(64);
      expect(clampDt(-10)).toBe(0);
      expect(clampDt(16)).toBe(16);
      // and poseAt itself never overshoots the settled target on a huge now
      const s = launchSaccade({ x: 0, y: 0 }, { x: 10, y: 0 }, 0, day, REF);
      expect(poseAt(s, 5_000_000)).toEqual({ x: 10, y: 0 });
    });
  });

  describe("vergence (R10)", () => {
    const left = { x: 100, y: 200 };
    const right = { x: 200, y: 200 };
    const travel = 5;

    it("converges on a near target between the eyes", () => {
      const { left: l, right: r } = vergedOffsets(
        left,
        right,
        { x: 150, y: 260 },
        travel,
      );
      // left eye bears right (+x toward centre), right eye bears left (−x)
      expect(l.x).toBeGreaterThan(0);
      expect(r.x).toBeLessThan(0);
    });

    it("produces near-parallel gaze for a distant target", () => {
      const { left: l, right: r } = vergedOffsets(
        left,
        right,
        { x: 20000, y: 200 },
        travel,
      );
      // both point essentially the same way → offsets nearly equal
      expect(Math.abs(l.x - r.x)).toBeLessThan(0.05);
      expect(Math.abs(l.y - r.y)).toBeLessThan(0.05);
    });

    it("caps the convergence angle before it goes comically cross-eyed", () => {
      // a target right between and very close would over-converge; the cap holds
      const cap = 0.3;
      const { left: l, right: r } = vergedOffsets(
        left,
        right,
        { x: 150, y: 205 },
        travel,
        cap,
      );
      const angBetween = Math.abs(Math.atan2(l.y, l.x) - Math.atan2(r.y, r.x));
      expect(angBetween).toBeLessThanOrEqual(cap + 1e-6);
    });
  });

  describe("R17 containment sweep (AE4)", () => {
    // The occluder intentionally clips the iris top/bottom (aperture ry < irisR),
    // so "disc inside aperture" can't apply to a lid-clipped painted eye; the
    // invariant that matters is that the iris CENTRE (hence the pupil) never
    // leaves the visible opening across the whole reachable envelope — max
    // travel × temperament × chained overshoot (the worst pose under retarget
    // chaining). Vergence never inflates magnitude (each eye offset ≤ travel and
    // the cap only rotates), so the envelope bounds it too.
    const env = reachEnvelopeFraction();
    const DIRS = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [0.7071, 0.7071],
      [-0.7071, 0.7071],
      [0.7071, -0.7071],
      [-0.7071, -0.7071],
    ] as const;

    it("the reachable envelope is a small fraction of image width", () => {
      expect(env).toBeGreaterThan(RIG.travelCeiling); // overshoot inflates travel
      expect(env).toBeLessThan(0.015);
    });

    for (const variant of PORTRAIT_VARIANTS) {
      const rig = RIG_MANIFEST[variant.basename];
      for (const [name, eye] of [
        ["left", rig.left],
        ["right", rig.right],
      ] as const) {
        it(`${variant.basename} ${name}: iris centre + envelope stays inside the aperture (10% margin)`, () => {
          // aperture shrunk 10% for a genuine safety margin (also swallows the
          // sub-pixel micro-drift, which is far smaller than 10% of the axes).
          const margined: Ellipse = {
            cx: eye.aperture.cx,
            cy: eye.aperture.cy,
            rx: eye.aperture.rx * 0.9,
            ry: eye.aperture.ry * 0.9,
          };
          for (const [dx, dy] of DIRS) {
            const px = eye.cx + dx * env;
            const py = eye.cy + dy * env;
            expect(
              inEllipse(px, py, margined),
              `${name} dir (${dx},${dy})`,
            ).toBe(true);
          }
        });
      }
    }
  });
});
