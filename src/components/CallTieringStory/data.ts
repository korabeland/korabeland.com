import type {
  MatrixBucket,
  MatrixQuestion,
  ShareSegment,
  ShareState,
} from "../../lib/explorable";

export const CALL_TIERING_SLUG = "call-tiering";

export const CHAPTERS = [
  { datum: "2 → 3", caption: "form questions into intent tiers" },
  { datum: "about 30% → <1%", caption: "call effort on Tier 3" },
] as const;

export const MATRIX_ROWS: MatrixQuestion = {
  question: "When were you hoping to start studying?",
  axis: "start timeframe",
  options: ["As soon as possible", "This year", "Next year", "Not sure yet"],
};

export const MATRIX_COLS: MatrixQuestion = {
  question: "Reason for enquiring: how ready are you to enroll?",
  axis: "intent to enroll",
  options: ["Ready to enroll", "Gathering information", "Just browsing"],
};

export const MATRIX_BUCKETS: MatrixBucket[] = [
  { label: "Tier 1", short: "T1", action: "Call first" },
  { label: "Tier 2", short: "T2", action: "Call next" },
  { label: "Tier 3", short: "T3", action: "Call last" },
];

// Pair-to-tier assignments are illustrative. The source pages publish the
// method, not the original conversion table.
export const MATRIX_CELLS = [
  [0, 0, 1],
  [0, 1, 1],
  [1, 1, 2],
  [1, 2, 2],
];

export const EFFORT_SEGMENTS: ShareSegment[] = [
  { key: "rest", label: "Tier 1 and Tier 2" },
  { key: "bottom", label: "Tier 3", focus: true },
];

export const EFFORT_STATES: ShareState[] = [
  {
    label: "Before",
    shares: { rest: "rest", bottom: 30 },
    values: { rest: "the rest", bottom: "about 30%" },
    verdict: "about 30% of call effort went to Tier 3.",
  },
  {
    label: "After",
    detail: "No calls to Tier 3",
    shares: { rest: "rest", bottom: 0.8 },
    values: { rest: "the rest", bottom: "less than 1%" },
    verdict: "less than 1% of call effort went to Tier 3, and conversion held.",
  },
];
