// Turns Vercel Web Analytics month rows into a CSV Korab can keep. The Hobby
// plan retains one month of data, so a monthly export is the only long-term
// record of pageviews. Pure: scripts/export-pageviews.ts fetches, this parses
// and formats, and Vitest covers both with fixtures.

export interface MonthRow {
  /** "YYYY-MM" */
  month: string;
  pageviews: number;
  visitors: number;
}

interface RawRow {
  timestamp?: unknown;
  pageviews?: unknown;
  visitors?: unknown;
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
      visitors: Number(row.visitors) || 0,
    };
  });
}

export function formatCsv(rows: readonly MonthRow[]): string {
  const lines = ["month,pageviews,visitors"];
  for (const r of [...rows].sort((a, b) => (a.month < b.month ? -1 : 1))) {
    lines.push(`${r.month},${r.pageviews},${r.visitors}`);
  }
  return `${lines.join("\n")}\n`;
}

/** First instant of the month `monthsBack` before `now`, as an ISO string. */
export function monthStart(now: Date, monthsBack: number): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1),
  ).toISOString();
}
