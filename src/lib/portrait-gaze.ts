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

const EYES_SHARED: PortraitEyes = {
  left: { cx: 0.422, cy: 0.404 },
  right: { cx: 0.612, cy: 0.399 },
  pupilRadius: 0.022,
  irisRadius: 0.035,
};

export const EYE_MANIFEST: Record<string, PortraitEyes> = {
  "portrait-illustrated": EYES_SHARED,
  "portrait-illustrated-day": EYES_SHARED,
};

// ── Engagement + movement constants ───────────────────────────────────────
export const GAZE = {
  /** Max pupil travel at full attenuation, fraction of image width (day base;
   *  night scales it down via temperament). Subtle by intent — tuned by feel. */
  travelFraction: 0.011,
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
