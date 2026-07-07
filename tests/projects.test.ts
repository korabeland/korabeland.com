import { describe, expect, it } from "vitest";
import { mapMetrics, type RawOutcomeMetric } from "@/lib/projects";

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
