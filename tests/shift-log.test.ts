import { describe, expect, it } from "vitest";
import {
  busiestWeek,
  type ContributionData,
  type ContributionDay,
  type ContributionLevel,
  type ContributionWeek,
  currentStreak,
  flattenDays,
  levelToIntensity,
  longestStreak,
  summaryStats,
} from "@/lib/shift-log";

/** Builds a week from parallel arrays of counts and levels, dated sequentially from `startDate`. */
function makeWeek(
  startDate: string,
  counts: number[],
  levels: ContributionLevel[],
): ContributionWeek {
  const start = new Date(`${startDate}T00:00:00Z`);
  const days: ContributionDay[] = counts.map((count, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    return {
      date: date.toISOString().slice(0, 10),
      count,
      level: levels[i],
    };
  });
  return { days };
}

function makeData(
  weeks: ContributionWeek[],
  overrides: Partial<Omit<ContributionData, "weeks">> = {},
): ContributionData {
  return {
    fetchedAt: "2026-07-06",
    source: "seed",
    total: weeks.flatMap((w) => w.days).reduce((sum, d) => sum + d.count, 0),
    weeks,
    ...overrides,
  };
}

describe("levelToIntensity", () => {
  it.each([
    ["NONE", 0],
    ["FIRST_QUARTILE", 1],
    ["SECOND_QUARTILE", 2],
    ["THIRD_QUARTILE", 3],
    ["FOURTH_QUARTILE", 4],
  ] as const)("maps %s to %d", (level, expected) => {
    expect(levelToIntensity(level)).toBe(expected);
  });

  it("defaults an unrecognised enum string to 0", () => {
    expect(levelToIntensity("SOMETHING_ELSE" as ContributionLevel)).toBe(0);
  });
});

describe("summary stats — happy path", () => {
  const data = makeData([
    makeWeek(
      "2026-06-01",
      [1, 0, 2, 0, 0, 0, 0],
      [
        "FIRST_QUARTILE",
        "NONE",
        "SECOND_QUARTILE",
        "NONE",
        "NONE",
        "NONE",
        "NONE",
      ],
    ),
    makeWeek(
      "2026-06-08",
      [3, 3, 3, 3, 0, 0, 0],
      [
        "THIRD_QUARTILE",
        "THIRD_QUARTILE",
        "THIRD_QUARTILE",
        "THIRD_QUARTILE",
        "NONE",
        "NONE",
        "NONE",
      ],
    ),
    makeWeek(
      "2026-06-15",
      [0, 0, 0, 0, 0, 1, 0],
      ["NONE", "NONE", "NONE", "NONE", "NONE", "FIRST_QUARTILE", "NONE"],
    ),
  ]);

  it("computes total from data.total (not a naive recompute)", () => {
    expect(summaryStats(data).total).toBe(data.total);
    expect(data.total).toBe(3 + 12 + 1);
  });

  it("finds the busiest week by index, total, and startDate", () => {
    const result = busiestWeek(data);
    expect(result).toEqual({ index: 1, total: 12, startDate: "2026-06-08" });
  });

  it("rolls busiestWeekTotal into summaryStats", () => {
    expect(summaryStats(data).busiestWeekTotal).toBe(12);
  });

  it("computes current streak ending at the last day", () => {
    // Last day (2026-06-21) has count 0, so current streak is 0.
    expect(summaryStats(data).currentStreak).toBe(0);
  });

  it("computes longest streak across the whole fixture", () => {
    // Week 2 has four consecutive contribution days.
    expect(summaryStats(data).longestStreak).toBe(4);
  });
});

describe("busiestWeek — tie-breaking", () => {
  it("resolves ties to the earliest week", () => {
    const data = makeData([
      makeWeek(
        "2026-06-01",
        [5, 0, 0, 0, 0, 0, 0],
        ["FOURTH_QUARTILE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"],
      ),
      makeWeek(
        "2026-06-08",
        [5, 0, 0, 0, 0, 0, 0],
        ["FOURTH_QUARTILE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"],
      ),
    ]);

    expect(busiestWeek(data)).toEqual({
      index: 0,
      total: 5,
      startDate: "2026-06-01",
    });
  });
});

describe("streak logic", () => {
  it("continues the current streak several days back from the last day", () => {
    const days = flattenDays(
      makeData([
        makeWeek(
          "2026-06-01",
          [0, 0, 1, 1, 1, 1, 1],
          [
            "NONE",
            "NONE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
          ],
        ),
      ]),
    );

    expect(currentStreak(days)).toBe(5);
    expect(longestStreak(days)).toBe(5);
  });

  it("returns 0 for current streak when the last day is zero", () => {
    const days = flattenDays(
      makeData([
        makeWeek(
          "2026-06-01",
          [1, 1, 1, 0, 0, 0, 0],
          [
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "NONE",
            "NONE",
            "NONE",
            "NONE",
          ],
        ),
      ]),
    );

    expect(currentStreak(days)).toBe(0);
    expect(longestStreak(days)).toBe(3);
  });

  it("finds a longest streak larger than the current streak across a mid-run gap", () => {
    const days = flattenDays(
      makeData([
        makeWeek(
          "2026-06-01",
          [1, 1, 1, 1, 0, 1, 1],
          [
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
            "NONE",
            "FIRST_QUARTILE",
            "FIRST_QUARTILE",
          ],
        ),
      ]),
    );

    expect(currentStreak(days)).toBe(2);
    expect(longestStreak(days)).toBe(4);
  });
});

describe("all-zero calendar", () => {
  const zeroWeek = makeWeek(
    "2026-06-01",
    [0, 0, 0, 0, 0, 0, 0],
    ["NONE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"],
  );
  const data = makeData([zeroWeek, zeroWeek]);

  it("produces zero stats with no divide-by-zero", () => {
    expect(summaryStats(data)).toEqual({
      total: 0,
      busiestWeekTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("maps every day's level to intensity 0", () => {
    for (const day of flattenDays(data)) {
      expect(levelToIntensity(day.level)).toBe(0);
    }
  });
});

describe("53-week response", () => {
  it("accepts and handles a fixture with 53 weeks", () => {
    const weeks: ContributionWeek[] = Array.from({ length: 53 }, (_, i) => {
      const startDate = new Date("2026-01-01T00:00:00Z");
      startDate.setUTCDate(startDate.getUTCDate() + i * 7);
      const iso = startDate.toISOString().slice(0, 10);
      // Make the last week's first day the busiest, to check across the full range.
      const counts = i === 52 ? [9, 0, 0, 0, 0, 0, 0] : [1, 0, 0, 0, 0, 0, 0];
      const levels: ContributionLevel[] =
        i === 52
          ? ["FOURTH_QUARTILE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"]
          : ["FIRST_QUARTILE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"];
      return makeWeek(iso, counts, levels);
    });

    const data = makeData(weeks);

    expect(data.weeks).toHaveLength(53);
    expect(flattenDays(data)).toHaveLength(53 * 7);

    const result = busiestWeek(data);
    expect(result.index).toBe(52);
    expect(result.total).toBe(9);
  });
});

describe("empty weeks array", () => {
  const data = makeData([]);

  it("returns the empty sentinel for busiestWeek", () => {
    expect(busiestWeek(data)).toEqual({ index: -1, total: 0, startDate: "" });
  });

  it("returns zero for both streaks", () => {
    const days = flattenDays(data);
    expect(currentStreak(days)).toBe(0);
    expect(longestStreak(days)).toBe(0);
  });

  it("returns an empty array from flattenDays", () => {
    expect(flattenDays(data)).toEqual([]);
  });
});
