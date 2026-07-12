// portrait-gaze.ts — pure gaze-rig math + geometry for the home hero portrait
// (R7). No DOM access by design: the rig lives in Portrait/index.astro's
// `<script>` and imports these helpers, exactly the way ShiftLog's cursor
// torch imports its falloff math from shift-log.ts. Keeping the geometry,
// attenuation, and saccade logic here is what lets Vitest exercise every
// bearing/clamp/threshold case without a browser (R7), and what lets the
// manifest coverage test fail CI when a portrait variant drifts (R10 / AE6).
//
// Coordinate model. All eye geometry is normalised to the portrait image box
// as fractions of its WIDTH (the box ships square, so a width-fraction reads
// the same vertically). The rig resolves those fractions against the live
// bounding rect each frame, so the numbers below are resolution-independent
// and shared by every width tier of a given source variant.

import type { Shift } from "./shift";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ── Shipped portrait variants (single source of truth) ────────────────────
// The two illustrated-portrait sources under src/assets/. This list is the
// SSOT that scripts/gen-hero-variants.ts builds its render jobs from AND that
// the manifest coverage test checks EYE_MANIFEST against — add a third
// portrait without a manifest entry and CI fails (AE6). `shift` records which
// palette shift each source is the painted state for; the geometry itself is
// effectively identical across the two (same illustration, re-coloured).
export interface PortraitVariant {
  /** Output filename stem, e.g. "portrait-illustrated". */
  basename: string;
  /** The shift this source is the painted state for. */
  shift: Shift;
}

export const PORTRAIT_VARIANTS: readonly PortraitVariant[] = [
  { basename: "portrait-illustrated", shift: "night" },
  { basename: "portrait-illustrated-day", shift: "day" },
] as const;

// ── Eye geometry manifest ─────────────────────────────────────────────────
// Measured against the illustration (dark-pixel pupil centroid, visually
// verified): left (0.422, 0.404), right (0.612, 0.399), effectively identical
// across the night/day re-colours. `pupilRadius` is the overlay pupil disc
// (a dark core fading to a matched iris halo) and `irisRadius` is the circular
// clip it travels inside — the clip keeps the disc from ever spilling onto the
// painted sclera. The invariant `pupilRadius + GAZE.travelFraction <=
// irisRadius` (asserted in the unit test) guarantees that at full day travel
// the disc stays inside its clip.
export interface EyeGeometry {
  /** Pupil centre x, fraction of image width. */
  cx: number;
  /** Pupil centre y, fraction of image width (box is square). */
  cy: number;
}

export interface PortraitEyes {
  left: EyeGeometry;
  right: EyeGeometry;
  /** Overlay pupil disc radius, fraction of image width. */
  pupilRadius: number;
  /** Circular clip radius the pupil travels within, fraction of image width. */
  irisRadius: number;
}

// Radii measured off the rendered eye (iris ≈ 0.017w, painted pupil ≈ 0.009w):
// the overlay pupil sits just above the painted pupil so it covers it, and the
// iris clip matches the painted iris so the disc can never reach the sclera.
const EYES_SHARED: PortraitEyes = {
  left: { cx: 0.422, cy: 0.404 },
  right: { cx: 0.612, cy: 0.399 },
  pupilRadius: 0.012,
  irisRadius: 0.018,
};

export const EYE_MANIFEST: Record<string, PortraitEyes> = {
  "portrait-illustrated": EYES_SHARED,
  "portrait-illustrated-day": EYES_SHARED,
};

// ── v2 rig geometry SSOT (U2) ─────────────────────────────────────────────
// Measured at real render scale on 2026-07-12 (canvas dark-centroid + marker
// grid at deviceScaleFactor 3; scratch scripts in .gaze-measure/, not shipped).
// The two sources differ in resolution (night 1254², day 1040²) so each is
// measured on its own pixels, but the normalised fractions are near-shared.
// Everything is a fraction of image WIDTH (the box ships square). This is the
// single source the eye-rig generator (`scripts/gen-eye-rig.ts`), the pinned-
// pose harness, and the Portrait rig all read; a coverage test fails CI when a
// PORTRAIT_VARIANTS entry has no rig geometry (AE7).
//
// v1's EYE_MANIFEST above stays until U7 retires the gradient-disc overlay; its
// pupil-centroid centres and the iris centres here can differ by a pixel or two
// (the painted pupil sits slightly off the iris centre for gaze direction — the
// sprite pivots on the iris centre so the whole painted iris moves as one disc).
export interface Ellipse {
  /** Centre x, fraction of image width. */
  cx: number;
  /** Centre y, fraction of image width (box is square). */
  cy: number;
  /** Semi-axis x, fraction of image width. */
  rx: number;
  /** Semi-axis y, fraction of image width. */
  ry: number;
}

export interface EyeRig {
  /** Iris disc centre — the moving sprite's pivot, fraction of image width. */
  cx: number;
  cy: number;
  /** Iris disc radius (the sprite), fraction of image width. Sized to carry the
   *  whole painted iris + limbus so it moves as one rigid disc. */
  irisR: number;
  /** Lid aperture the sprite is visible within; the occluder punches this hole
   *  and clips the iris top/bottom the way the real lids do. */
  aperture: Ellipse;
}

export interface PortraitRig {
  left: EyeRig;
  right: EyeRig;
  /** Face zone (R8): cursor inside → direct eye contact. Sized to contain both
   *  iris centres plus the full travel + vergence envelope (asserted). */
  faceZone: Ellipse;
  /** Spatial hysteresis on the face-zone boundary (R8): the enter-boundary is
   *  radii × (1 − this), the exit-boundary radii × (1 + this). Keeps a cursor
   *  grazing the edge from flip-flopping (paired with a dwell in U5). */
  faceZoneHysteresis: number;
}

export const RIG_MANIFEST: Record<string, PortraitRig> = {
  "portrait-illustrated": {
    left: {
      cx: 0.425,
      cy: 0.4027,
      irisR: 0.023,
      aperture: { cx: 0.4266, cy: 0.4027, rx: 0.0351, ry: 0.016 },
    },
    right: {
      cx: 0.6053,
      cy: 0.3963,
      irisR: 0.0255,
      aperture: { cx: 0.6045, cy: 0.3963, rx: 0.0303, ry: 0.02 },
    },
    faceZone: { cx: 0.515, cy: 0.4, rx: 0.17, ry: 0.1 },
    faceZoneHysteresis: 0.08,
  },
  "portrait-illustrated-day": {
    left: {
      cx: 0.425,
      cy: 0.4029,
      irisR: 0.024,
      aperture: { cx: 0.426, cy: 0.4029, rx: 0.0385, ry: 0.0173 },
    },
    right: {
      cx: 0.6077,
      cy: 0.3981,
      irisR: 0.0255,
      aperture: { cx: 0.6096, cy: 0.4, rx: 0.0327, ry: 0.0192 },
    },
    faceZone: { cx: 0.516, cy: 0.4, rx: 0.17, ry: 0.1 },
    faceZoneHysteresis: 0.08,
  },
};

// ── v2 movement envelope (U2/U4) ──────────────────────────────────────────
// Travel ceiling tuned by Korab at the one-eye proof (2026-07-12): 0.007w of
// iris travel at full day attenuation ≈ 2.3px on the 340px desktop hero. Night
// scales this down via temperament. `vergenceMargin` is the extra reach the
// containment sizing budgets for converging per-eye bearings (U6).
export const RIG = {
  travelCeiling: 0.007,
  vergenceMargin: 0.004,
} as const;

/** True when a point (width-fractions, relative to the image box) is inside an
 *  ellipse — normalised radius ≤ 1. Shared by the face-zone check and the
 *  geometry invariants. */
export function inEllipse(px: number, py: number, e: Ellipse): boolean {
  const nx = (px - e.cx) / e.rx;
  const ny = (py - e.cy) / e.ry;
  return nx * nx + ny * ny <= 1;
}

// ── Engagement + movement constants ───────────────────────────────────────
export const GAZE = {
  /** Max pupil travel at full attenuation, fraction of image width (day base;
   *  night scales it down via temperament). Subtle by intent — kept within
   *  `irisRadius - pupilRadius` so the disc stays inside the painted iris. */
  travelFraction: 0.005,
  /** Proximity band = portrait half-diagonal + this many px. Gaze engages
   *  inside the band and cuts off beyond it (R1). */
  bandPadding: 78,
  /** Gaze returns to rest after this long without pointer movement (R3). */
  idleMs: 3000,
  /** Attenuation never drops below this inside the band (R1). */
  attenuationFloor: 0.25,
} as const;

// ── Shift temperament (R8) ────────────────────────────────────────────────
// Two parameter sets, not two code paths: the rig looks up the set for the
// live `data-time` shift each frame. Day is alert (full travel, quick jumps);
// night is drowsy (reduced travel, slower jumps). `saccadeThresholdRatio` is
// the fraction of max travel a target must stray before the pupil commits a
// new fixation (R6) — same feel in both shifts, so it stays constant.
export interface Temperament {
  /** Multiplier on GAZE.travelFraction. */
  travelScale: number;
  /** Saccade jump duration, ms (fast, with stillness between — R6). */
  jumpMs: number;
  /** Stray threshold as a fraction of max travel px before a new fixation. */
  saccadeThresholdRatio: number;
}

export const TEMPERAMENT: Record<Shift, Temperament> = {
  day: { travelScale: 1.0, jumpMs: 90, saccadeThresholdRatio: 0.55 },
  night: { travelScale: 0.65, jumpMs: 170, saccadeThresholdRatio: 0.55 },
};

export function temperamentFor(shift: Shift): Temperament {
  return TEMPERAMENT[shift];
}

// ── Pure geometry + movement helpers ──────────────────────────────────────

export function rectCenter(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Half the diagonal of the rect — the base radius of the proximity band. */
export function halfDiagonal(r: Rect): number {
  return Math.hypot(r.width, r.height) / 2;
}

/** Outer radius of the proximity band, measured from the portrait centre. */
export function bandOuterRadius(
  r: Rect,
  padding: number = GAZE.bandPadding,
): number {
  return halfDiagonal(r) + padding;
}

/** True when the point is within the portrait image box (R2 eye-contact). */
export function isInside(p: Point, r: Rect): boolean {
  return (
    p.x >= r.left &&
    p.x <= r.left + r.width &&
    p.y >= r.top &&
    p.y <= r.top + r.height
  );
}

/** Straight-line distance from the point to the portrait centre. */
export function centerDistance(p: Point, r: Rect): number {
  const c = rectCenter(r);
  return Math.hypot(p.x - c.x, p.y - c.y);
}

/** True when the cursor is close enough to engage the rig (R1 / R4). */
export function inBand(centerDist: number, bandOuter: number): boolean {
  return centerDist <= bandOuter;
}

/**
 * Distance-attenuated gaze strength (R1): 1 at the portrait boundary
 * (centre distance <= half-diagonal), easing linearly down to `floor` at the
 * band's outer edge, and clamped to [floor, 1] throughout. Callers treat a
 * centre distance beyond `bandOuter` as disengaged (see `inBand`).
 */
export function attenuation(
  centerDist: number,
  halfDiag: number,
  bandOuter: number,
  floor: number = GAZE.attenuationFloor,
): number {
  const span = bandOuter - halfDiag;
  if (span <= 0) return 1;
  // 1 at the portrait boundary, 0 at the band's outer edge; interpolate that
  // across [floor, 1] so strength eases to exactly `floor` at the edge.
  const t = Math.min(1, Math.max(0, (bandOuter - centerDist) / span));
  return floor + (1 - floor) * t;
}

/** Max pupil travel in px for a given image width and temperament. */
export function travelPx(
  imageWidth: number,
  temperament: Temperament,
  base: number = GAZE.travelFraction,
): number {
  return imageWidth * base * temperament.travelScale;
}

/** Absolute viewport centres of both eyes for a live portrait rect. */
export function eyeCenters(
  eyes: PortraitEyes,
  r: Rect,
): { left: Point; right: Point } {
  return {
    left: {
      x: r.left + eyes.left.cx * r.width,
      y: r.top + eyes.left.cy * r.width,
    },
    right: {
      x: r.left + eyes.right.cx * r.width,
      y: r.top + eyes.right.cy * r.width,
    },
  };
}

/**
 * Pupil offset from an eye toward the cursor, capped at `maxTravel` px. The
 * pupil deflects fully toward the target (fixed magnitude, not proportional to
 * distance) so the gaze reads as "looking at" rather than "leaning toward";
 * the magnitude only shrinks below `maxTravel` when the cursor is nearer than
 * the travel radius (which only happens inside the image, where the rig rests
 * anyway — R2).
 */
export function gazeOffset(
  eye: Point,
  cursor: Point,
  maxTravel: number,
): Point {
  const dx = cursor.x - eye.x;
  const dy = cursor.y - eye.y;
  const len = Math.hypot(dx, dy);
  if (len === 0 || maxTravel <= 0) return { x: 0, y: 0 };
  const mag = Math.min(maxTravel, len);
  return { x: (dx / len) * mag, y: (dy / len) * mag };
}

/**
 * Whether the desired fixation has strayed past the saccade threshold from the
 * currently-held one (R6). Below the threshold the pupil holds still; above it
 * the rig commits a new fixation and lets the CSS transition jump to it.
 */
export function shouldSaccade(
  current: Point,
  desired: Point,
  threshold: number,
): boolean {
  return Math.hypot(desired.x - current.x, desired.y - current.y) > threshold;
}

// ══════════════════════════════════════════════════════════════════════════
// v2 fixation state machine (U5). A pure reducer over cursor + lifecycle
// events with injected timestamps — no DOM, no rAF — so Vitest exercises every
// transition with synthetic cursor traces (the same testability rationale that
// shaped v1, now covering classifier windows and reset flavours). The Portrait
// script (U7) owns geometry (band/face-zone membership against the live rect)
// and side effects (fetch, reveal, hide); it passes the reducer pre-computed
// booleans and reads back `state` + `target`. The v1 GAZE.idleMs / inside-equals
// -rest API is superseded here and removed when U7 retires the v1 component.
// ══════════════════════════════════════════════════════════════════════════

export type GazeState =
  | "GATED_OFF" // gate failed at load, or reduced-motion flipped on (terminal)
  | "LOADING" // gate passed, layers fetching/decoding
  | "DORMANT" // a fetch/decode failed (atomic, permanent for the session)
  | "CONTACT" // direct eye contact — eyes on the viewer (rest)
  | "TRACKING"; // eyes following the cursor

export interface GazeSample {
  x: number;
  y: number;
  t: number;
}

// v2 temperament: day alert (quick to notice a pause, snappier saccades), night
// drowsy (longer fixation window, slower saccades). Two parameter sets, not two
// code paths. Fixation fields drive U5; the main-sequence fields drive U6. All
// values are starting points judged by Korab at real render scale (deferred).
export interface GazeTemperament {
  /** Multiplier on RIG.travelCeiling (day full, night reduced). */
  travelScale: number;
  /** I-DT dispersion window: cursor still within `dispersionPx` over this long → contact. */
  fixationWindowMs: number;
  /** Dispersion (Δx+Δy span) below this over a full window classifies a fixation. */
  dispersionPx: number;
  /** Velocity above this (px/ms) exits contact back to tracking (a separate
   *  threshold from entry so drag–pause–drag can't ping-pong). */
  velocityPxPerMs: number;
  /** Minimum dwell inside the face-zone enter-boundary before contact commits. */
  faceZoneDwellMs: number;
  /** Main sequence (U6): saccade duration = floor + slope × amplitude(px). */
  saccadeFloorMs: number;
  saccadeSlopeMsPerPx: number;
  /** Overshoot fraction on large saccades, and the corrective settle time. */
  overshoot: number;
  settleMs: number;
  /** Sub-pixel micro-drift in held contact (amplitude px, rate Hz). */
  microDriftPx: number;
  microDriftHz: number;
}

export const GAZE_TEMPERAMENT: Record<Shift, GazeTemperament> = {
  day: {
    travelScale: 1.0,
    fixationWindowMs: 350,
    dispersionPx: 6,
    velocityPxPerMs: 0.5,
    faceZoneDwellMs: 120,
    saccadeFloorMs: 30,
    saccadeSlopeMsPerPx: 2.2,
    overshoot: 0.15,
    settleMs: 60,
    microDriftPx: 0.3,
    microDriftHz: 0.8,
  },
  night: {
    travelScale: 0.65,
    fixationWindowMs: 650,
    dispersionPx: 6,
    velocityPxPerMs: 0.5,
    faceZoneDwellMs: 160,
    saccadeFloorMs: 50,
    saccadeSlopeMsPerPx: 3.5,
    overshoot: 0.12,
    settleMs: 90,
    microDriftPx: 0.3,
    microDriftHz: 0.6,
  },
};

export function gazeTemperamentFor(shift: Shift): GazeTemperament {
  return GAZE_TEMPERAMENT[shift];
}

// Events. The component computes geometry against the live portrait rect and
// hands the reducer booleans; fixation itself is classified over the raw
// viewport coordinates (a cursor held still during scroll reads as a pause).
export type GazeEvent =
  | { type: "decoded" } // all layers decoded → reveal at rest
  | { type: "decodeFailed" } // any fetch/decode failure → dormant
  | {
      type: "pointer";
      x: number;
      y: number;
      t: number;
      /** Inside the proximity band (else the gaze rests — band demoted to this). */
      inBand: boolean;
      /** Inside the face-zone enter-boundary (radii × (1 − hysteresis)). */
      inZoneEnter: boolean;
      /** Inside the face-zone exit-boundary (radii × (1 + hysteresis)). */
      inZoneExit: boolean;
    }
  | { type: "leave" } // pointer-leave / visible band-exit → rest saccade
  | { type: "interrupt" } // window blur / tab hidden / shift toggle → snap to rest
  | { type: "reducedMotion" }; // reduced-motion flipped on → snap, hide (terminal)

export interface GazeMachine {
  state: GazeState;
  /** Rolling recent cursor samples (viewport) for the dispersion classifier. */
  samples: GazeSample[];
  /** Where the eyes look: null = contact/rest (the viewer); else a viewport point. */
  target: Point | null;
  /** True when the last rest transition should snap instantly (no saccade). */
  snap: boolean;
  /** When the cursor first crossed the face-zone enter-boundary (dwell clock). */
  zoneEnterAt: number | null;
}

const MAX_SAMPLES = 48;

/** Initial machine. The component evaluates the double gate once at load and
 *  passes the result: a failed gate is terminal GATED_OFF (no assets fetched). */
export function initGaze(gatePassed: boolean): GazeMachine {
  return {
    state: gatePassed ? "LOADING" : "GATED_OFF",
    samples: [],
    target: null,
    snap: true,
    zoneEnterAt: null,
  };
}

function pushSample(
  samples: readonly GazeSample[],
  s: GazeSample,
  windowMs: number,
): GazeSample[] {
  const keep = samples.filter(
    (p) => s.t - p.t <= windowMs * 1.5 && s.t - p.t >= 0,
  );
  keep.push(s);
  return keep.length > MAX_SAMPLES ? keep.slice(-MAX_SAMPLES) : keep;
}

/** I-DT dispersion over the samples within [now − windowMs, now]. `full` is true
 *  only when the window is actually covered, so a not-yet-fillable window (fast
 *  entry, sparse samples) cannot false-trigger a fixation. */
function dispersionOf(
  samples: readonly GazeSample[],
  now: number,
  windowMs: number,
): { full: boolean; disp: number } {
  const win = samples.filter((s) => now - s.t <= windowMs);
  if (win.length < 2) return { full: false, disp: Number.POSITIVE_INFINITY };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const s of win) {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  // `full` means we have continuous observation spanning the whole window (the
  // buffer's oldest sample predates it), so a fixation requires a genuine
  // windowMs-long pause — earlier move samples must age out of the window first.
  const full = now - samples[0].t >= windowMs;
  return { full, disp: maxX - minX + (maxY - minY) };
}

/** Instantaneous speed (px/ms) from the last two samples. */
function speedOf(samples: readonly GazeSample[]): number {
  if (samples.length < 2) return 0;
  const a = samples[samples.length - 2];
  const b = samples[samples.length - 1];
  const dt = b.t - a.t;
  if (dt <= 0) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y) / dt;
}

function restTo(m: GazeMachine, snap: boolean): GazeMachine {
  return {
    ...m,
    state: "CONTACT",
    target: null,
    snap,
    samples: [],
    zoneEnterAt: null,
  };
}

/** The v2 reducer: `(machine, event, temperament) → machine`, pure. */
export function gazeReduce(
  m: GazeMachine,
  e: GazeEvent,
  temp: GazeTemperament,
): GazeMachine {
  // Terminal states swallow everything.
  if (m.state === "GATED_OFF" || m.state === "DORMANT") return m;

  switch (e.type) {
    case "reducedMotion":
      // Disarm-only: GATED_OFF is terminal for the session (assets stay cached).
      return {
        ...m,
        state: "GATED_OFF",
        target: null,
        snap: true,
        samples: [],
        zoneEnterAt: null,
      };
    case "decodeFailed":
      return m.state === "LOADING" ? { ...m, state: "DORMANT" } : m;
    case "decoded":
      // Reveal at rest — rest parity is what makes the reveal imperceptible.
      return m.state === "LOADING" ? restTo(m, false) : m;
    case "interrupt":
      // blur / tab hidden / shift toggle: snap to rest in the same frame.
      return m.state === "CONTACT" || m.state === "TRACKING"
        ? restTo(m, true)
        : m;
    case "leave":
      // pointer-leave / visible band-exit: launch a rest saccade.
      return m.state === "CONTACT" || m.state === "TRACKING"
        ? restTo(m, false)
        : m;
    case "pointer": {
      if (m.state !== "CONTACT" && m.state !== "TRACKING") return m; // pre-reveal
      const samples = pushSample(
        m.samples,
        { x: e.x, y: e.y, t: e.t },
        temp.fixationWindowMs,
      );
      // Outside the band → rest (the band's only remaining behavioural role).
      if (!e.inBand) {
        return {
          ...m,
          state: "CONTACT",
          target: null,
          snap: false,
          samples: [],
          zoneEnterAt: null,
        };
      }
      // Face-zone dwell clock (hysteresis: enter-boundary + minimum dwell).
      let zoneEnterAt = m.zoneEnterAt;
      if (e.inZoneEnter) {
        if (zoneEnterAt === null) zoneEnterAt = e.t;
      } else {
        zoneEnterAt = null;
      }
      const zoneCommitted =
        zoneEnterAt !== null && e.t - zoneEnterAt >= temp.faceZoneDwellMs;

      if (m.state === "TRACKING") {
        const { full, disp } = dispersionOf(
          samples,
          e.t,
          temp.fixationWindowMs,
        );
        // → CONTACT on a classified fixation or a committed face-zone entry.
        if (zoneCommitted || (full && disp <= temp.dispersionPx)) {
          return {
            ...m,
            state: "CONTACT",
            target: null,
            snap: false,
            samples,
            zoneEnterAt,
          };
        }
        return {
          ...m,
          state: "TRACKING",
          target: { x: e.x, y: e.y },
          snap: false,
          samples,
          zoneEnterAt,
        };
      }
      // CONTACT → TRACKING only outside the exit-boundary and moving fast enough.
      if (!e.inZoneExit && speedOf(samples) > temp.velocityPxPerMs) {
        return {
          ...m,
          state: "TRACKING",
          target: { x: e.x, y: e.y },
          snap: false,
          samples,
          zoneEnterAt,
        };
      }
      return {
        ...m,
        state: "CONTACT",
        target: null,
        snap: false,
        samples,
        zoneEnterAt,
      };
    }
    default:
      return m;
  }
}
