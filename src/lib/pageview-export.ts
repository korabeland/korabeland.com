// Turns Vercel Web Analytics month rows into a CSV Korab can keep. The Hobby
// plan retains one month of data, so a monthly export is the only long-term
// record of pageviews. Pure: scripts/export-pageviews.ts fetches, this parses
// and formats, and Vitest covers both with fixtures.

export interface MonthRow {
  /** "YYYY-MM" */
  month: string;
  pageviews: number;
  /** Approximate hours at the start of the month that had left the window. */
  hoursMissing?: number;
}

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

export function formatCsv(rows: readonly MonthRow[]): string {
  const lines = ["month,pageviews,status,approx_hours_missing"];
  for (const r of [...rows].sort((a, b) => (a.month < b.month ? -1 : 1))) {
    const missing = r.hoursMissing ?? 0;
    lines.push(
      `${r.month},${r.pageviews},${missing > 0 ? "partial" : "complete"},${missing}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * The prior month, exported on the first UTC day. The Hobby window reaches back
 * one month from the query, and analytics report hourly, so each full hour past
 * midnight drops an hour from the start of the prior month. Those hours cannot
 * be recovered, so the range reports how many fell out and the CSV marks the
 * month partial rather than letting a short total read as complete.
 */
export function completedMonthRange(now: Date): {
  since: string;
  until: string;
  hoursMissing: number;
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
    hoursMissing: now.getUTCHours(),
  };
}
