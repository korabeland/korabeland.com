// Figure data for the flagship case study at /work/call-tiers-lead-scoring.
//
// Rule: every number here is published on one of the three source case
// studies (intent-tiers, call-tier-discipline, lead-scoring). Anything a
// figure needs that those pages do not publish is drawn as a shape with no
// number on it and is listed under ILLUSTRATIVE below.
// tests/lead-scoring-story.test.ts holds this file to that rule.

import type {
  CutoffNote,
  MatrixBucket,
  MatrixQuestion,
  ShareSegment,
  ShareState,
} from "../../lib/explorable";

/** The entry this story renders, in src/content/projects. */
export const STORY_SLUG = "call-tiers-lead-scoring";

/** Blocks (heading included) that come before each chapter's figure. */
export const FIGURE_AFTER = [3, 3, 3] as const;

/** The chapter rail: one real datum per chapter. */
export const CHAPTERS = [
  { datum: "2 → 3", caption: "form questions into intent tiers" },
  { datum: "27.8% → 0.7%", caption: "call effort on the bottom tier" },
  { datum: "~600k leads", caption: "assembled for the decile model" },
] as const;

// ─── Figure 01: the tier matrix ────────────────────────────────────────────
// Measured: two form questions (study timeframe, reason for enquiring,
// expressed through readiness to enroll)
// combined into a matrix of every answer pairing, giving three intent tiers.
// ILLUSTRATIVE: which tier each pairing lands in.

export const MATRIX_ROWS: MatrixQuestion = {
  question: "When do you want to start studying?",
  axis: "timeframe",
  options: ["As soon as possible", "This year", "Next year", "Not sure yet"],
};

export const MATRIX_COLS: MatrixQuestion = {
  question: "Reason for enquiring: how ready are you to enroll?",
  axis: "readiness",
  options: ["Ready to enroll", "Gathering information", "Just browsing"],
};

export const MATRIX_BUCKETS: MatrixBucket[] = [
  { label: "Tier 1", short: "T1", action: "Call first" },
  { label: "Tier 2", short: "T2", action: "Call next" },
  { label: "Tier 3", short: "T3", action: "Call last" },
];

export const MATRIX_CELLS = [
  [0, 0, 1],
  [0, 1, 1],
  [1, 2, 2],
  [2, 2, 2],
];

// ─── Figure 02: where call effort went ─────────────────────────────────────
// Measured: bottom-tier share of call effort 27.8% before, 0.7% after;
// conversion held; top tier applied at eight times the bottom tier's rate.
// Not published, so not printed: how the rest splits between the other tiers.

export const EFFORT_SEGMENTS: ShareSegment[] = [
  { key: "rest", label: "Top and middle tiers" },
  { key: "bottom", label: "Bottom tier", focus: true },
];

export const EFFORT_STATES: ShareState[] = [
  {
    label: "Before",
    detail: "Every tier called",
    shares: { rest: "rest", bottom: 27.8 },
    values: { rest: "the rest", bottom: "27.8%" },
    verdict:
      "more than a quarter of call effort went to the tier least likely to apply.",
  },
  {
    label: "After",
    detail: "Bottom tier not called",
    shares: { rest: "rest", bottom: 0.7 },
    values: { rest: "the rest", bottom: "0.7%" },
    verdict:
      "that effort moved to the leads more likely to apply, and conversion held.",
  },
];

export const RATE_RATIO = {
  measure: "30-day application rate by tier",
  high: { label: "Top tier", value: "8×" },
  low: { label: "Bottom tier", value: "1×" },
  multiple: 8,
};

// ─── Figure 03: three tiers against ten deciles ────────────────────────────
// Measured: the tiers reached roughly 27% of call effort cut; the model
// should move that toward half; about 600k leads were assembled to build it.
// ILLUSTRATIVE: the height of every decile bar, and the assumption that call
// effort spreads evenly across deciles.

export const DECILE_HEIGHTS = [100, 64, 46, 34, 26, 20, 15, 11, 8, 5];

export const TIER_CUT_PERCENT = 27;

export const DECILE_NOTES: CutoffNote[] = [
  { upTo: 0, text: "Every lead gets a call. This is coverage." },
  { upTo: 20, text: "A smaller cut than the three tiers already made." },
  {
    upTo: 30,
    text: "About where the three tiers stopped: roughly 27% of call effort.",
  },
  {
    upTo: 40,
    text: "Past the tiers. Only a score for each lead can cut here.",
  },
  {
    upTo: 50,
    text: "Half. This is where the cut should climb toward once the model lands.",
  },
  {
    upTo: 100,
    text: "Past half. Only the real curve can say whether a cut this deep is safe.",
  },
];

export function decileReadout(cut: number, steps: number): string {
  if (cut === 0) return `Cutoff: all ${steps} deciles called.`;
  if (cut === steps) return `Cutoff: no deciles called.`;
  const noun = cut === 1 ? "decile" : "deciles";
  return `Cutoff: bottom ${cut} ${noun} of ${steps} not called.`;
}
