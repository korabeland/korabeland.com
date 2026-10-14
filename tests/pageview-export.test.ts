import { describe, expect, it } from "vitest";
import { formatCsv, monthStart, parseMonthRows } from "@/lib/pageview-export";

describe("pageview export", () => {
  it("reads month rows from the analytics response", () => {
    expect(
      parseMonthRows({
        data: [
          { timestamp: "2026-10-01T00:00:00.000Z", visitors: 2, pageviews: 5 },
          { timestamp: "2026-09-01T00:00:00.000Z", visitors: 0, pageviews: 0 },
        ],
      }),
    ).toEqual([
      { month: "2026-10", pageviews: 5, visitors: 2 },
      { month: "2026-09", pageviews: 0, visitors: 0 },
    ]);
  });
  it("writes CSV oldest month first", () => {
    expect(
      formatCsv([
        { month: "2026-10", pageviews: 5, visitors: 2 },
        { month: "2026-09", pageviews: 7, visitors: 3 },
      ]),
    ).toBe("month,pageviews,visitors\n2026-09,7,3\n2026-10,5,2\n");
  });
  it("rejects a response without rows", () => {
    expect(() => parseMonthRows({})).toThrow();
    expect(() => parseMonthRows({ data: [{ pageviews: 1 }] })).toThrow();
  });
  it("finds the first of the month, across a year boundary", () => {
    expect(monthStart(new Date("2026-01-20T10:00:00Z"), 2)).toBe(
      "2025-11-01T00:00:00.000Z",
    );
    expect(monthStart(new Date("2026-10-14T10:00:00Z"), 0)).toBe(
      "2026-10-01T00:00:00.000Z",
    );
  });
});
