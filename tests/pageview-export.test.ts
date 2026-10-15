import { describe, expect, it } from "vitest";
import {
  completedMonthRange,
  formatCsv,
  parseMonthRows,
} from "@/lib/pageview-export";

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
  it("requests the prior completed month early on the first UTC day", () => {
    expect(completedMonthRange(new Date("2026-01-01T00:30:00Z"))).toEqual({
      since: "2025-12-01T00:00:00.000Z",
      until: "2025-12-31T23:59:59.999Z",
    });
  });
  it("refuses late on the first UTC day, when the month would be partial", () => {
    expect(() => completedMonthRange(new Date("2026-11-01T18:00:00Z"))).toThrow(
      /first UTC hour/,
    );
    expect(() => completedMonthRange(new Date("2026-11-01T01:00:00Z"))).toThrow(
      /first UTC hour/,
    );
  });
  it("refuses on any other day", () => {
    expect(() => completedMonthRange(new Date("2026-01-02T00:00:00Z"))).toThrow(
      /first UTC hour/,
    );
  });
});
