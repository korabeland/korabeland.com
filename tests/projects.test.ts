import { describe, expect, it } from "vitest";
import {
  formatSpan,
  mapMetrics,
  projectHref,
  type RawOutcomeMetric,
} from "@/lib/projects";

function metric(overrides: Partial<RawOutcomeMetric> = {}): RawOutcomeMetric {
  return {
    value: "42",
    label: "Some metric",
    provenance: "Measured over Q1, self-reported from the CRM export.",
    ...overrides,
  };
}

describe("mapMetrics — happy path", () => {
  it("carries value, label, and provenance through for every metric", () => {
    const raw: RawOutcomeMetric[] = [
      metric({
        value: "10",
        label: "Dimensions compared",
        provenance: "Ten criteria scored jointly with engineering.",
      }),
      metric({
        value: "2 months",
        label: "Pilot window",
        provenance: "Planned duration as scoped at launch.",
      }),
    ];
    expect(mapMetrics("ai-sms-pilot", raw)).toEqual([
      {
        value: "10",
        label: "Dimensions compared",
        provenance: "Ten criteria scored jointly with engineering.",
      },
      {
        value: "2 months",
        label: "Pilot window",
        provenance: "Planned duration as scoped at launch.",
      },
    ]);
  });

  it("trims surrounding whitespace from provenance", () => {
    const raw = [metric({ provenance: "  spaced out  " })];
    expect(mapMetrics("lead-scoring", raw)[0].provenance).toBe("spaced out");
  });
});

describe("mapMetrics — error path (AE4 enforcement)", () => {
  it("throws when a metric's provenance is missing (null)", () => {
    const raw = [metric({ label: "Stakeholders aligned", provenance: null })];
    expect(() => mapMetrics("lead-scoring", raw)).toThrow(
      'Metric "Stakeholders aligned" in project "lead-scoring" is missing provenance (AE4: no metric ships without provenance).',
    );
  });

  it("throws when a metric's provenance is an empty string", () => {
    const raw = [metric({ label: "Dataset assembled", provenance: "" })];
    expect(() => mapMetrics("lead-scoring", raw)).toThrow(
      'Metric "Dataset assembled" in project "lead-scoring" is missing provenance (AE4: no metric ships without provenance).',
    );
  });

  it("throws when a metric's provenance is whitespace-only", () => {
    const raw = [
      metric({ label: "Vendor cost difference", provenance: "   " }),
    ];
    expect(() => mapMetrics("ai-sms-pilot", raw)).toThrow(
      'Metric "Vendor cost difference" in project "ai-sms-pilot" is missing provenance (AE4: no metric ships without provenance).',
    );
  });
});

describe("projectHref — category routing", () => {
  it("routes work projects under /work", () => {
    expect(projectHref({ slug: "lead-scoring", category: "work" })).toBe(
      "/work/lead-scoring",
    );
  });

  it("routes side projects under /lab", () => {
    expect(projectHref({ slug: "perian", category: "side" })).toBe(
      "/lab/perian",
    );
  });
});

describe("formatSpan — fact-strip duration", () => {
  it("returns empty when there is no start date", () => {
    expect(formatSpan(null, null)).toBe("");
    expect(formatSpan(null, "2026-07-05")).toBe("");
  });

  it("returns the start year alone while unshipped", () => {
    expect(formatSpan("2026-04-01", null)).toBe("2026");
  });

  it("counts whole months within one year", () => {
    expect(formatSpan("2026-04-01", "2026-07-05")).toBe("2026 · 3 months");
  });

  it("floors at 1 month for a same-month ship", () => {
    expect(formatSpan("2026-07-01", "2026-07-20")).toBe("2026 · 1 month");
  });

  it("renders a year range when the span crosses years", () => {
    expect(formatSpan("2025-11-13", "2026-01-10")).toBe("2025–2026 · 2 months");
  });

  it("keeps boundary dates in their own year regardless of timezone", () => {
    // A date-only string fed to `new Date()` is UTC midnight; local getters
    // in a negative-offset zone would pull these into the prior day/year.
    expect(formatSpan("2026-01-01", null)).toBe("2026");
    expect(formatSpan("2025-12-15", "2026-01-01")).toBe("2025–2026 · 1 month");
  });
});
