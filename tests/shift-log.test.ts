import { describe, expect, it } from "vitest";
import seedJson from "@/content/shift-log/contributions.seed.json";
import {
  busiestWeek,
  type ContributionData,
  type ContributionDay,
  type ContributionLevel,
  type ContributionWeek,
  currentStreak,
  flattenDays,
  glowFalloff,
  isGlowCandidate,
  levelToIntensity,
  longestStreak,
  monthTicks,
  summaryStats,
} from "@/lib/shift-log";

const CONTRIBUTION_LEVELS: ContributionLevel[] = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];

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

  it("counts a lone contributing day as a current streak of 1", () => {
    const days = flattenDays(
      makeData([
        makeWeek(
          "2026-06-01",
          [1, 0, 0, 0, 0, 0, 0],
          ["FIRST_QUARTILE", "NONE", "NONE", "NONE", "NONE", "NONE", "NONE"],
        ),
      ]),
    );
    // The loop must terminate at index 0 without an interior zero to stop it.
    expect(currentStreak([days[0]])).toBe(1);
    expect(longestStreak([days[0]])).toBe(1);
  });

  it("streaks equal the array length when every day contributes", () => {
    const days = flattenDays(
      makeData([
        makeWeek(
          "2026-06-01",
          [1, 2, 1, 3, 1, 2, 1],
          [
            "FIRST_QUARTILE",
            "SECOND_QUARTILE",
            "FIRST_QUARTILE",
            "THIRD_QUARTILE",
            "FIRST_QUARTILE",
            "SECOND_QUARTILE",
            "FIRST_QUARTILE",
          ],
        ),
      ]),
    );
    // No zero anywhere: both loops must run to the boundary and count all 7.
    expect(currentStreak(days)).toBe(7);
    expect(longestStreak(days)).toBe(7);
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

describe("monthTicks", () => {
  const ZERO_LEVELS: ContributionLevel[] = [
    "NONE",
    "NONE",
    "NONE",
    "NONE",
    "NONE",
    "NONE",
    "NONE",
  ];
  const ZERO_COUNTS = [0, 0, 0, 0, 0, 0, 0];
  // Independent re-derivation of the label, so the seed property check doesn't
  // just re-run the implementation to "verify" itself.
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
  ];
  const labelFor = (date: string) => MONTH_ABBR[Number(date.slice(5, 7)) - 1];

  it("returns one tick per month, each at that month's first week, in order", () => {
    const data = makeData([
      makeWeek("2026-06-01", ZERO_COUNTS, ZERO_LEVELS), // Jun → tick
      makeWeek("2026-06-08", ZERO_COUNTS, ZERO_LEVELS), // Jun → deduped
      makeWeek("2026-07-06", ZERO_COUNTS, ZERO_LEVELS), // Jul → tick
      makeWeek("2026-08-03", ZERO_COUNTS, ZERO_LEVELS), // Aug → tick
    ]);

    expect(monthTicks(data)).toEqual([
      { label: "Jun", weekIndex: 0 },
      { label: "Jul", weekIndex: 2 },
      { label: "Aug", weekIndex: 3 },
    ]);
  });

  it("attributes a week straddling a month boundary by its first day", () => {
    // Jul 30 → Aug 5: five of seven days are August, but the first day is July.
    const data = makeData([
      makeWeek("2026-07-30", ZERO_COUNTS, ZERO_LEVELS),
      makeWeek("2026-08-06", ZERO_COUNTS, ZERO_LEVELS),
    ]);

    expect(monthTicks(data)).toEqual([
      { label: "Jul", weekIndex: 0 },
      { label: "Aug", weekIndex: 1 },
    ]);
  });

  it("yields 12 distinct labels with no duplicate across a 53-week wrap", () => {
    const weeks: ContributionWeek[] = Array.from({ length: 53 }, (_, i) => {
      const start = new Date("2025-07-06T00:00:00Z");
      start.setUTCDate(start.getUTCDate() + i * 7);
      return makeWeek(
        start.toISOString().slice(0, 10),
        ZERO_COUNTS,
        ZERO_LEVELS,
      );
    });

    const ticks = monthTicks(makeData(weeks));

    expect(ticks).toHaveLength(12);
    // The window ends back in July, but that label was already spent on week 0.
    expect(new Set(ticks.map((t) => t.label)).size).toBe(12);
    expect(ticks[0]).toEqual({ label: "Jul", weekIndex: 0 });
  });

  it("returns an empty array for an empty weeks array", () => {
    expect(monthTicks(makeData([]))).toEqual([]);
  });

  it("skips a zero-length-days week without throwing", () => {
    const data = makeData([
      { days: [] },
      makeWeek("2026-03-02", ZERO_COUNTS, ZERO_LEVELS),
    ]);

    expect(() => monthTicks(data)).not.toThrow();
    expect(monthTicks(data)).toEqual([{ label: "Mar", weekIndex: 1 }]);
  });

  it("labels the committed seed in chronological order, one per month", () => {
    const ticks = monthTicks(seedJson as ContributionData);

    expect(ticks).toHaveLength(12);
    expect(new Set(ticks.map((t) => t.label)).size).toBe(12);
    for (let i = 1; i < ticks.length; i += 1) {
      expect(ticks[i].weekIndex).toBeGreaterThan(ticks[i - 1].weekIndex);
    }
    // Every tick names the month of the week it points at.
    for (const tick of ticks) {
      const seedWeeks = (seedJson as ContributionData).weeks;
      expect(tick.label).toBe(labelFor(seedWeeks[tick.weekIndex].days[0].date));
    }
  });
});

describe("glowFalloff", () => {
  const R = 36;

  it("is full intensity at the cursor and zero at the radius edge", () => {
    expect(glowFalloff(0, R)).toBe(1);
    expect(glowFalloff(R, R)).toBe(0);
  });

  it("interpolates linearly between the cursor and the edge", () => {
    expect(glowFalloff(R / 2, R)).toBeCloseTo(0.5);
    expect(glowFalloff(R / 4, R)).toBeCloseTo(0.75);
  });

  it("clamps to 0 past the radius rather than going negative", () => {
    expect(glowFalloff(R * 2, R)).toBe(0);
    expect(glowFalloff(R + 0.01, R)).toBe(0);
  });

  it("never returns NaN when the radius is zero", () => {
    const t = glowFalloff(0, 0);
    expect(Number.isNaN(t)).toBe(false);
    expect(t).toBe(0);
  });
});

describe("isGlowCandidate", () => {
  it("lights only the top two intensities (3 and 4)", () => {
    expect(isGlowCandidate(3)).toBe(true);
    expect(isGlowCandidate(4)).toBe(true);
  });

  it("leaves the quiet intensities (0-2) flat", () => {
    expect(isGlowCandidate(0)).toBe(false);
    expect(isGlowCandidate(1)).toBe(false);
    expect(isGlowCandidate(2)).toBe(false);
  });
});

// The committed seed is the production fallback data — it ships on every
// tokenless build (dev, CI, Vercel shallow-clone). A corrupted seed would sail
// through the suite and render a broken grid in prod, so validate its shape.
describe("committed seed", () => {
  const seed = seedJson as ContributionData;

  it("declares itself as seed with an ISO fetchedAt date", () => {
    expect(seed.source).toBe("seed");
    expect(seed.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof seed.total).toBe("number");
  });

  it("carries at least 52 weeks", () => {
    expect(seed.weeks.length).toBeGreaterThanOrEqual(52);
  });

  it("has only valid enum levels and numeric counts on every day", () => {
    for (const day of flattenDays(seed)) {
      expect(CONTRIBUTION_LEVELS).toContain(day.level);
      // No day maps to the defensive default — every level is a real bucket.
      expect(levelToIntensity(day.level)).not.toBeUndefined();
      expect(typeof day.count).toBe("number");
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("computes summary stats without throwing", () => {
    const stats = summaryStats(seed);
    expect(stats.total).toBe(seed.total);
    expect(stats.busiestWeekTotal).toBeGreaterThanOrEqual(0);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(0);
    expect(stats.longestStreak).toBeGreaterThanOrEqual(stats.currentStreak);
  });
});
