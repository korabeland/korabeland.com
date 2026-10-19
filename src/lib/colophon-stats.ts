/**
 * Pure computation, validation, and formatting for the colophon's
 * "Built with AI, decided by me" live repository readout.
 *
 * Everything here is deterministic and fixture-tested (tests/colophon-stats.test.ts):
 * no DOM, no fs, no network. The build-time git/GitHub extraction and seed
 * fallback live in `scripts/colophon-stats-fetch.ts` and
 * `scripts/gen-trail-register.ts`.
 */

export interface DateRange {
  /** ISO "YYYY-MM-DD" start date (inclusive). */
  startDate: string;
  /** ISO "YYYY-MM-DD" end date (inclusive). */
  endDate: string;
}

export interface PullRequestRecord {
  number: number;
  state: "open" | "closed";
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
}

export interface PullRequestStats {
  /** Pull requests merged to main (merged_at !== null). */
  mergedCount: number;
  /** Pull requests closed without merging (state === "closed" && merged_at === null). */
  closedUnmergedCount: number;
  /** Date span of merged pull requests (by merged_at). */
  mergedRange: DateRange;
  /** Date span of closed-unmerged pull requests (by closed_at). */
  closedUnmergedRange: DateRange;
}

export interface GitCommitRecord {
  sha: string;
  /** ISO "YYYY-MM-DD" author date. */
  date: string;
  subject: string;
  body: string;
}

export interface GitStats {
  /** Total commits on main. */
  totalCommits: number;
  /** Date span of all commits on main. */
  commitRange: DateRange;
  /** Commits carrying an AI model Co-authored-by trailer in git log. */
  modelTrailerCommits: number;
  /** Date span of commits carrying an AI model Co-authored-by trailer. */
  modelTrailerRange: DateRange;
  /** Commits after modelTrailerRange.endDate that carry no model trailer in git. */
  unattributedRecentCommits: number;
  /** Date span of those post-trailer commits under supervisor routing. */
  recentRange: DateRange;
  /** Merged commits whose body records automated no-mistakes pipeline passes. */
  noMistakesCommits: number;
  /** Total automated pipeline fix rounds recorded across those commits. */
  noMistakesRounds: number;
}

export type ColophonMetric<T> = T & {
  asOf: string;
  source: "live" | "seed";
};

export interface ColophonStatsData {
  pullRequests: ColophonMetric<PullRequestStats>;
  commits: ColophonMetric<GitStats>;
}

export interface MeterSegments {
  primaryWidth: number;
  secondaryWidth: number;
  secondaryX: number;
  primaryPercent: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MODEL_TRAILER_RE =
  /^\s*co-authored-by:\s*(?:claude|gemini|codex|openai|gpt)\b|^\s*co-authored-by:[^\n]*<noreply@anthropic\.com>/im;

const NO_MISTAKES_ROUND_RE =
  /^\s*\*?\s*no-mistakes\((?:review|ci|lint|document|test)\):/gm;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toDateOnly(iso: string | null | undefined): string | null {
  if (typeof iso !== "string" || iso.length < 10) return null;
  const slice = iso.slice(0, 10);
  return ISO_DATE_RE.test(slice) ? slice : null;
}

function dateRangeFrom(dates: readonly string[]): DateRange | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return {
    startDate: sorted[0],
    endDate: sorted[sorted.length - 1],
  };
}

/** Whether a commit body carries an AI model Co-authored-by trailer. */
export function hasModelCoAuthorTrailer(body: string): boolean {
  return MODEL_TRAILER_RE.test(body);
}

/** Count of automated no-mistakes pipeline fix lines recorded in a commit body. */
export function countNoMistakesRounds(body: string): number {
  return [...body.matchAll(NO_MISTAKES_ROUND_RE)].length;
}

/**
 * Computes pull-request counts and date ranges from public GitHub PR records.
 * Open pull requests are excluded from both shipped and closed-unmerged counts.
 * Returns null if no merged pull requests are present.
 */
export function summarizePullRequests(
  prs: readonly PullRequestRecord[],
): PullRequestStats | null {
  const mergedDates: string[] = [];
  const closedUnmergedDates: string[] = [];

  for (const pr of prs) {
    if (pr.mergedAt !== null) {
      const mergedDate = toDateOnly(pr.mergedAt) ?? toDateOnly(pr.createdAt);
      if (!mergedDate) return null;
      mergedDates.push(mergedDate);
    } else if (pr.state === "closed") {
      const closedDate = toDateOnly(pr.closedAt) ?? toDateOnly(pr.createdAt);
      if (!closedDate) return null;
      closedUnmergedDates.push(closedDate);
    }
  }

  const mergedRange = dateRangeFrom(mergedDates);
  if (!mergedRange) return null;

  const closedUnmergedRange = dateRangeFrom(closedUnmergedDates) ?? mergedRange;

  return {
    mergedCount: mergedDates.length,
    closedUnmergedCount: closedUnmergedDates.length,
    mergedRange,
    closedUnmergedRange,
  };
}

/**
 * Computes commit, model-trailer, and no-mistakes pipeline counts from `git log`
 * records on `main`. Returns null if the commit list is empty or malformed.
 */
export function summarizeGitCommits(
  commits: readonly GitCommitRecord[],
): GitStats | null {
  if (commits.length === 0) return null;

  const allDates: string[] = [];
  const trailerDates: string[] = [];
  let noMistakesCommits = 0;
  let noMistakesRounds = 0;

  for (const commit of commits) {
    const date = toDateOnly(commit.date);
    if (!date || !commit.sha) return null;
    allDates.push(date);

    if (hasModelCoAuthorTrailer(commit.body)) {
      trailerDates.push(date);
    }

    const rounds = countNoMistakesRounds(commit.body);
    if (rounds > 0) {
      noMistakesCommits += 1;
      noMistakesRounds += rounds;
    }
  }

  const commitRange = dateRangeFrom(allDates);
  if (!commitRange) return null;

  const modelTrailerRange = dateRangeFrom(trailerDates) ?? {
    startDate: commitRange.startDate,
    endDate: commitRange.startDate,
  };

  const recentDates = commits
    .filter(
      (c) =>
        !hasModelCoAuthorTrailer(c.body) &&
        c.date.slice(0, 10) > modelTrailerRange.endDate,
    )
    .map((c) => c.date.slice(0, 10));

  const recentRange = dateRangeFrom(recentDates) ?? {
    startDate: commitRange.endDate,
    endDate: commitRange.endDate,
  };

  return {
    totalCommits: commits.length,
    commitRange,
    modelTrailerCommits: trailerDates.length,
    modelTrailerRange,
    unattributedRecentCommits: recentDates.length,
    recentRange,
    noMistakesCommits,
    noMistakesRounds,
  };
}

/** Combines each live metric with its own dated seed fallback. */
export function resolveColophonStats(
  livePullRequests: PullRequestStats | null,
  liveCommits: GitStats | null,
  seed: ColophonStatsData | null,
  asOf: string,
): ColophonStatsData | null {
  const pullRequests = livePullRequests
    ? { ...livePullRequests, asOf, source: "live" as const }
    : seed?.pullRequests;
  const commits = liveCommits
    ? { ...liveCommits, asOf, source: "live" as const }
    : seed?.commits;

  if (!pullRequests || !commits) return null;
  return { pullRequests, commits };
}

function parseIsoParts(
  isoDate: string,
): { year: number; monthIndex: number; day: number } | null {
  if (!ISO_DATE_RE.test(isoDate)) return null;
  const year = Number(isoDate.slice(0, 4));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const day = Number(isoDate.slice(8, 10));
  if (
    !Number.isInteger(year) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return { year, monthIndex, day };
}

/** Formats "YYYY-MM-DD" as "11 April 2026" without timezone-sensitive Date parsing. */
export function formatHumanDate(isoDate: string): string {
  const parts = parseIsoParts(isoDate);
  if (!parts) return isoDate;
  return `${parts.day} ${MONTH_NAMES[parts.monthIndex]} ${parts.year}`;
}

/**
 * Formats a DateRange in plain words:
 * - Same day: "17 October 2026"
 * - Same month and year: "1 to 17 October 2026"
 * - Same year: "11 April to 17 October 2026"
 * - Different years: "1 December 2025 to 1 March 2026"
 */
export function formatHumanDateRange(range: DateRange): string {
  if (range.startDate === range.endDate) {
    return formatHumanDate(range.startDate);
  }
  const start = parseIsoParts(range.startDate);
  const end = parseIsoParts(range.endDate);
  if (!start || !end) {
    return `${range.startDate} to ${range.endDate}`;
  }
  if (start.year === end.year && start.monthIndex === end.monthIndex) {
    return `${start.day} to ${end.day} ${MONTH_NAMES[end.monthIndex]} ${end.year}`;
  }
  if (start.year === end.year) {
    return `${start.day} ${MONTH_NAMES[start.monthIndex]} to ${end.day} ${MONTH_NAMES[end.monthIndex]} ${end.year}`;
  }
  return `${start.day} ${MONTH_NAMES[start.monthIndex]} ${start.year} to ${end.day} ${MONTH_NAMES[end.monthIndex]} ${end.year}`;
}

/**
 * Computes SVG rect widths for a two-part proportional meter bar.
 * Pure integer/rounded math so SVG attributes are deterministic.
 */
export function meterSegments(
  primaryCount: number,
  secondaryCount: number,
  totalWidth = 1000,
): MeterSegments {
  const safePrimary = Math.max(0, primaryCount);
  const safeSecondary = Math.max(0, secondaryCount);
  const total = safePrimary + safeSecondary;
  if (total <= 0 || totalWidth <= 0) {
    return {
      primaryWidth: 0,
      secondaryWidth: 0,
      secondaryX: 0,
      primaryPercent: 0,
    };
  }
  const ratio = safePrimary / total;
  const primaryWidth = Math.round(ratio * totalWidth);
  const secondaryWidth = Math.max(0, totalWidth - primaryWidth);
  return {
    primaryWidth,
    secondaryWidth,
    secondaryX: primaryWidth,
    primaryPercent: Math.round(ratio * 100),
  };
}

function isValidDateRange(value: unknown): value is DateRange {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.startDate === "string" &&
    ISO_DATE_RE.test(r.startDate) &&
    typeof r.endDate === "string" &&
    ISO_DATE_RE.test(r.endDate)
  );
}

/** Runtime shape check for `stats.json` / `stats.seed.json`. */
export function isValidColophonStats(raw: unknown): raw is ColophonStatsData {
  if (!raw || typeof raw !== "object") return false;
  const data = raw as Record<string, unknown>;

  const prs = data.pullRequests as Record<string, unknown> | undefined;
  if (
    !prs ||
    typeof prs !== "object" ||
    typeof prs.asOf !== "string" ||
    !ISO_DATE_RE.test(prs.asOf) ||
    (prs.source !== "live" && prs.source !== "seed") ||
    typeof prs.mergedCount !== "number" ||
    prs.mergedCount <= 0 ||
    typeof prs.closedUnmergedCount !== "number" ||
    prs.closedUnmergedCount < 0 ||
    !isValidDateRange(prs.mergedRange) ||
    !isValidDateRange(prs.closedUnmergedRange)
  ) {
    return false;
  }

  const commits = data.commits as Record<string, unknown> | undefined;
  if (
    !commits ||
    typeof commits !== "object" ||
    typeof commits.asOf !== "string" ||
    !ISO_DATE_RE.test(commits.asOf) ||
    (commits.source !== "live" && commits.source !== "seed") ||
    typeof commits.totalCommits !== "number" ||
    commits.totalCommits <= 0 ||
    typeof commits.modelTrailerCommits !== "number" ||
    commits.modelTrailerCommits < 0 ||
    typeof commits.unattributedRecentCommits !== "number" ||
    commits.unattributedRecentCommits < 0 ||
    typeof commits.noMistakesCommits !== "number" ||
    commits.noMistakesCommits < 0 ||
    typeof commits.noMistakesRounds !== "number" ||
    commits.noMistakesRounds < 0 ||
    !isValidDateRange(commits.commitRange) ||
    !isValidDateRange(commits.modelTrailerRange) ||
    !isValidDateRange(commits.recentRange)
  ) {
    return false;
  }

  return true;
}
