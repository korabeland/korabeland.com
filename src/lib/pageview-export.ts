// Turns Vercel Web Analytics month rows into a CSV Korab can keep. The Hobby
// plan retains one month of data, so a monthly export is the only long-term
// record of pageviews. Pure: scripts/export-pageviews.ts fetches, this parses
// and formats, and Vitest covers both with fixtures.

export interface MonthRow {
  /** "YYYY-MM" */
  month: string;
  pageviews: number;
}

export type CoverageStatus = "complete" | "partial";

interface RawRow {
  timestamp?: unknown;
  pageviews?: unknown;
}

/** Rows from the analytics "visits/aggregate" response grouped by month. */
export function parseMonthRows(response: unknown): MonthRow[] {
  const data = (response as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) {
    throw new Error("analytics response has no data rows");
  }
  return (data as RawRow[]).map((row) => {
    if (
      typeof row.timestamp !== "string" ||
      !/^\d{4}-\d{2}/.test(row.timestamp)
    ) {
      throw new Error("analytics row has no usable timestamp");
    }
    return {
      month: row.timestamp.slice(0, 7),
      pageviews: Number(row.pageviews) || 0,
    };
  });
}

export function formatCsv(
  rows: readonly MonthRow[],
  status: CoverageStatus,
): string {
  const lines = ["month,pageviews,status"];
  for (const r of [...rows].sort((a, b) => (a.month < b.month ? -1 : 1))) {
    lines.push(`${r.month},${r.pageviews},${status}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Determine whether the one-month window still includes the prior month's first hour. */
export function coverageStatus(now: Date): CoverageStatus {
  return now.getUTCDate() === 1 && now.getUTCHours() === 0
    ? "complete"
    : "partial";
}

/**
 * The prior month, exported on the first UTC day. The caller checks coverage
 * after the query, because the query can cross the retention boundary.
 */
export function completedMonthRange(now: Date): {
  since: string;
  until: string;
} {
  if (now.getUTCDate() !== 1) {
    throw new Error(
      "export pageviews on the first UTC day of the month; later, the prior month has left the one-month reporting window",
    );
  }
  return {
    since: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    ).toISOString(),
    until: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999),
    ).toISOString(),
  };
}
