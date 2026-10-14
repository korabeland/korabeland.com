import { describe, expect, it } from "vitest";
import { formatCsv, monthStart, parseMonthRows } from "@/lib/pageview-export";

describe("pageview export", () => {
  it("reads month rows from the analytics response", () => {
    expect(
      parseMonthRows({
        data: [
          { timestamp: "2026-10-01T00:00:00.000Z", pageviews: 5 },
          { timestamp: "2026-09-01T00:00:00.000Z", pageviews: 0 },
        ],
      }),
    ).toEqual([
      { month: "2026-10", pageviews: 5 },
      { month: "2026-09", pageviews: 0 },
    ]);
  });
  it("writes CSV oldest month first", () => {
    expect(
      formatCsv([
        { month: "2026-10", pageviews: 5 },
        { month: "2026-09", pageviews: 7 },
      ]),
    ).toBe("month,pageviews\n2026-09,7\n2026-10,5\n");
  });
  it("rejects a response without rows", () => {
    expect(() => parseMonthRows({})).toThrow();
    expect(() => parseMonthRows({ data: [{ pageviews: 1 }] })).toThrow();
  });
  it("finds the first of the month, across a year boundary", () => {
    expect(monthStart(new Date("2026-01-20T10:00:00Z"))).toBe(
      "2025-12-01T00:00:00.000Z",
    );
  });
});
