import { describe, expect, it } from "vitest";
import {
  type ExperienceSummary,
  mapExperienceEntry,
  type RawExperienceEntry,
  sortExperience,
} from "@/lib/experience";

function raw(overrides: Partial<RawExperienceEntry> = {}): RawExperienceEntry {
  return {
    company: "Acme",
    role: "Operator",
    location: "Melbourne",
    startDate: "2020-01-01",
    endDate: "2022-01-01",
    achievements: [
      { text: "Did a thing", metricValue: null, metricLabel: null },
    ],
    tags: ["ops"],
    testimonial: { quote: null, attribution: null, sourceUrl: null },
    ...overrides,
  };
}

describe("mapExperienceEntry", () => {
  it("marks a role with no end date as current", () => {
    expect(mapExperienceEntry("acme", raw({ endDate: null })).current).toBe(
      true,
    );
  });

  it("marks a role with an end date as not current", () => {
    expect(
      mapExperienceEntry("acme", raw({ endDate: "2022-01-01" })).current,
    ).toBe(false);
  });

  it("returns a null testimonial when the quote is empty", () => {
    expect(mapExperienceEntry("acme", raw()).testimonial).toBeNull();
  });

  it("returns a testimonial object when a quote is present", () => {
    const s = mapExperienceEntry(
      "acme",
      raw({
        testimonial: {
          quote: "Great to work with",
          attribution: "A Boss",
          sourceUrl: "https://example.co",
        },
      }),
    );
    expect(s.testimonial).toEqual({
      quote: "Great to work with",
      attribution: "A Boss",
      sourceUrl: "https://example.co",
    });
  });

  it("coalesces a bullet with no metric value to metric: null", () => {
    const s = mapExperienceEntry("acme", raw());
    expect(s.achievements[0].metric).toBeNull();
  });

  it("keeps a bullet's highlight metric when a value is present", () => {
    const s = mapExperienceEntry(
      "acme",
      raw({
        achievements: [
          { text: "Cut effort", metricValue: "30–50%", metricLabel: "faster" },
        ],
      }),
    );
    expect(s.achievements[0].metric).toEqual({
      value: "30–50%",
      label: "faster",
    });
  });

  it("coalesces an absent location to an empty string, never undefined", () => {
    const s = mapExperienceEntry("acme", raw({ location: null }));
    expect(s.location).toBe("");
  });
});

describe("sortExperience", () => {
  const make = (
    slug: string,
    startDate: string,
    current: boolean,
  ): ExperienceSummary => ({
    slug,
    company: slug,
    role: "role",
    location: "",
    startDate,
    endDate: current ? null : "2024-01-01",
    current,
    achievements: [],
    tags: [],
    testimonial: null,
  });

  it("floats current roles first, then reverse-chron by start date", () => {
    const out = sortExperience([
      make("old", "2015-01-01", false),
      make("current", "2019-01-01", true),
      make("recent", "2023-01-01", false),
    ]);
    expect(out.map((r) => r.slug)).toEqual(["current", "recent", "old"]);
  });

  it("orders two current roles by start date descending", () => {
    const out = sortExperience([
      make("c-older", "2018-01-01", true),
      make("c-newer", "2021-01-01", true),
    ]);
    expect(out.map((r) => r.slug)).toEqual(["c-newer", "c-older"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      make("a", "2020-01-01", false),
      make("b", "2021-01-01", true),
    ];
    const before = input.map((r) => r.slug);
    sortExperience(input);
    expect(input.map((r) => r.slug)).toEqual(before);
  });
});
