/**
 * Pure transform/stats for the shift-log (R9 GitHub contribution grid).
 *
 * Everything here is deterministic and fixture-tested (tests/shift-log.test.ts):
 * no DOM, no fs, no network. The fetch/validate/fall-back-to-seed side lives in
 * `scripts/gen-shift-log.ts`; the render (grid markup, staleness caption) lives
 * in the `ShiftLog` component (U5).
 */

export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

export interface ContributionDay {
  /** ISO "YYYY-MM-DD", UTC-bucketed (GitHub's own bucketing). */
  date: string;
  /** contributionCount for that day. */
  count: number;
  /** GitHub's contributionLevel enum (not a 0-4 number). */
  level: ContributionLevel;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface ContributionData {
  /** "YYYY-MM-DD" — when the data was fetched (staleness caption source). */
  fetchedAt: string;
  source: "api" | "seed";
  /** totalContributions for the year, trusted as-is from the API's own bucket. */
  total: number;
  /** ~52-53 weeks, each up to 7 days. */
  weeks: ContributionWeek[];
}

export interface BusiestWeek {
  index: number;
  total: number;
  startDate: string;
}

export interface SummaryStats {
  total: number;
  busiestWeekTotal: number;
  currentStreak: number;
  longestStreak: number;
}

export interface MonthTick {
  /** Three-letter month abbreviation, e.g. "Jul". */
  label: string;
  /** Index into `weeks` of the first week that falls in this month. */
  weekIndex: number;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * One tick per month for the grid's top edge, each anchored to the first week
 * whose first day falls in that month — so ticks land on real week columns, not
 * even spacing (R2). A week straddling a boundary is attributed by its first
 * day, matching GitHub's own week bucketing.
 *
 * The month is read straight off the "YYYY-MM-DD" string (positions 5-6) rather
 * than via `new Date`, so the result is timezone-independent and byte-stable.
 * Deduped by month label: a 52-53 week window wraps back to its starting month
 * on the final column, and repeating that label would clutter the frame — the
 * first occurrence wins, yielding a clean 12-label run.
 */
export function monthTicks(data: ContributionData): MonthTick[] {
  const ticks: MonthTick[] = [];
  const seen = new Set<string>();

  data.weeks.forEach((week, weekIndex) => {
    // Mirror busiestWeek's empty-day guard (shift-log.ts:100): a zero-length
    // week yields "", which we skip rather than index into a bogus month.
    const date = week.days[0]?.date ?? "";
    if (!date) return;

    const label = MONTH_ABBR[Number(date.slice(5, 7)) - 1];
    if (!label || seen.has(label)) return;

    seen.add(label);
    ticks.push({ label, weekIndex });
  });

  return ticks;
}

/** Maps a contributionLevel enum string to the 0-4 amber visual intensity scale. */
export function levelToIntensity(level: ContributionLevel): 0 | 1 | 2 | 3 | 4 {
  switch (level) {
    case "NONE":
      return 0;
    case "FIRST_QUARTILE":
      return 1;
    case "SECOND_QUARTILE":
      return 2;
    case "THIRD_QUARTILE":
      return 3;
    case "FOURTH_QUARTILE":
      return 4;
    default:
      // Defensive: an unrecognised enum string renders as empty rather than throwing.
      return 0;
  }
}

/** All days in chronological order (weeks are already chronological). */
export function flattenDays(data: ContributionData): ContributionDay[] {
  return data.weeks.flatMap((week) => week.days);
}

/**
 * The week with the highest summed count. Ties resolve to the earliest week.
 * An empty `weeks` array returns the empty sentinel.
 */
export function busiestWeek(data: ContributionData): BusiestWeek {
  if (data.weeks.length === 0) {
    return { index: -1, total: 0, startDate: "" };
  }

  let bestIndex = 0;
  let bestTotal = -1;

  data.weeks.forEach((week, index) => {
    const weekTotal = week.days.reduce((sum, day) => sum + day.count, 0);
    if (weekTotal > bestTotal) {
      bestTotal = weekTotal;
      bestIndex = index;
    }
  });

  return {
    index: bestIndex,
    total: bestTotal,
    startDate: data.weeks[bestIndex].days[0]?.date ?? "",
  };
}

/** Length of the consecutive run of contribution days ending at the last day. */
export function currentStreak(days: ContributionDay[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].count > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** The longest consecutive run of contribution days anywhere in the array. */
export function longestStreak(days: ContributionDay[]): number {
  let longest = 0;
  let running = 0;
  for (const day of days) {
    if (day.count > 0) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }
  return longest;
}

/** Convenience aggregator combining the stats above. */
export function summaryStats(data: ContributionData): SummaryStats {
  const days = flattenDays(data);
  return {
    total: data.total,
    busiestWeekTotal: busiestWeek(data).total,
    currentStreak: currentStreak(days),
    longestStreak: longestStreak(days),
  };
}
