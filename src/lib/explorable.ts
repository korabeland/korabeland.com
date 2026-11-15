// Pure logic for the Explorable figure components (src/components/Explorable).
// Kept apart from the .astro files so Vitest covers it with plain fixtures and
// the client scripts share one implementation with the server render.

/** One state of a ShareShift bar: each segment's share of the whole, in
 *  percent. Exactly one segment may be "rest", which takes what is left. */
export type ShareValue = number | "rest";

export interface ShareSegment {
  key: string;
  label: string;
  /** The segment the figure is about. It takes the signal accent. */
  focus?: boolean;
}

export interface ShareState {
  /** Short name on the switch, e.g. "Before". */
  label: string;
  /** One line under the name, e.g. "Every tier called". */
  detail: string;
  /** Share per segment key, in percent. One segment may be "rest". */
  shares: Record<string, ShareValue>;
  /** Value text per segment key, as it should be printed. */
  values: Record<string, string>;
  /** The sentence this state proves. */
  verdict: string;
}

/**
 * Resolves a ShareShift state to layout percentages. A "rest" segment takes
 * the remainder so the caller never has to print (or invent) a derived
 * figure. Throws when the shares cannot describe one whole.
 */
export function resolveShares(shares: readonly ShareValue[]): number[] {
  const restCount = shares.filter((s) => s === "rest").length;
  if (restCount > 1) {
    throw new Error("ShareShift: at most one segment may be 'rest'.");
  }
  const known = shares.reduce<number>(
    (sum, s) => (s === "rest" ? sum : sum + s),
    0,
  );
  if (shares.some((s) => s !== "rest" && (s < 0 || !Number.isFinite(s)))) {
    throw new Error("ShareShift: shares must be finite and non-negative.");
  }
  if (known > 100 + 1e-9) {
    throw new Error(`ShareShift: shares add up to ${known}, more than 100.`);
  }
  if (restCount === 0 && Math.abs(known - 100) > 1e-9) {
    throw new Error(
      `ShareShift: shares add up to ${known}; add a 'rest' segment or make them total 100.`,
    );
  }
  const rest = Math.round((100 - known) * 1000) / 1000;
  return shares.map((s) => (s === "rest" ? rest : s));
}

export interface MatrixQuestion {
  /** The question as the reader should see it. */
  question: string;
  /** Short axis name for the readout, e.g. "timeframe". */
  axis: string;
  options: string[];
}

export interface MatrixBucket {
  /** Full name, e.g. "Tier 1". */
  label: string;
  /** Short code drawn in each cell, e.g. "T1". */
  short: string;
  /** What happens to a lead in this bucket, e.g. "Call first". */
  action: string;
}

/**
 * Looks up the bucket for one answer pairing in a PairingMatrix. `cells` is
 * indexed [row][column] and holds bucket indexes. Throws on a ragged or
 * out-of-range matrix so a bad fixture fails the build, not the reader.
 */
export function bucketFor(
  cells: readonly (readonly number[])[],
  row: number,
  col: number,
): number {
  const bucket = cells[row]?.[col];
  if (bucket === undefined) {
    throw new Error(`PairingMatrix: no cell at row ${row}, column ${col}.`);
  }
  return bucket;
}

/** Checks a PairingMatrix definition is rectangular and in range. */
export function assertMatrix(
  cells: readonly (readonly number[])[],
  rowCount: number,
  colCount: number,
  bucketCount: number,
): void {
  if (cells.length !== rowCount) {
    throw new Error(
      `PairingMatrix: ${cells.length} rows of cells for ${rowCount} row options.`,
    );
  }
  for (const [r, row] of cells.entries()) {
    if (row.length !== colCount) {
      throw new Error(
        `PairingMatrix: row ${r} has ${row.length} cells for ${colCount} column options.`,
      );
    }
    for (const bucket of row) {
      if (!Number.isInteger(bucket) || bucket < 0 || bucket >= bucketCount) {
        throw new Error(`PairingMatrix: bucket ${bucket} is out of range.`);
      }
    }
  }
}

export interface CutoffGeometry {
  /** How many steps are cut (not kept). */
  cut: number;
  /** Position of the cutoff line from the left edge, in percent. */
  keptPercent: number;
  /** Share of the ranked population below the cutoff, in percent. */
  cutPercent: number;
}

/**
 * Geometry for a CutoffDial. The population is ranked best to worst, left to
 * right, and split into `steps` equal bands. `kept` bands stay; the rest are
 * cut.
 */
export function cutoffGeometry(
  kept: number,
  steps: number,
): CutoffGeometry {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new Error("CutoffDial: steps must be a positive whole number.");
  }
  const clamped = Math.min(steps, Math.max(0, Math.round(kept)));
  const keptPercent = (clamped / steps) * 100;
  const cutPercent = 100 - keptPercent;
  return {
    cut: steps - clamped,
    keptPercent,
    cutPercent,
  };
}

export interface CutoffNote {
  /** Applies while the cut share is at or below this percent. */
  upTo: number;
  text: string;
}

/** Picks the note for a cut share: the first whose `upTo` covers it. */
export function noteFor(notes: readonly CutoffNote[], cutPercent: number) {
  const sorted = [...notes].sort((a, b) => a.upTo - b.upTo);
  const hit = sorted.find((n) => cutPercent <= n.upTo + 1e-9);
  return (hit ?? sorted[sorted.length - 1])?.text ?? "";
}

/** One row of a ChapterRail. */
export interface RailChapter {
  /** The chapter's one figure, exactly as published, e.g. "27.8% → 0.7%". */
  datum: string;
  /** What the datum measures, lower case, no full stop. */
  caption: string;
  /** In-page anchor. Omit for a static rail. */
  href?: string;
}
