import { describe, expect, it } from "vitest";
import type { ExperienceSummary } from "@/lib/experience";
import {
  buildResume,
  formatResumeMetric,
  RESUME_CONTACT,
  toResumeRole,
  toResumeSkills,
} from "@/lib/resume";
import type { SkillsData } from "@/lib/skills";
import { STATUS } from "@/lib/status";

function role(overrides: Partial<ExperienceSummary> = {}): ExperienceSummary {
  return {
    slug: "acme-operator",
    company: "Acme",
    role: "Operator",
    location: "Melbourne",
    startDate: "2020-01-01",
    endDate: "2022-06-01",
    current: false,
    achievements: [
      { text: "Did a thing", metric: { value: "30%", label: "faster" } },
      { text: "Did another", metric: null },
    ],
    tags: ["ops"],
    testimonial: { quote: "Great", attribution: "A boss", sourceUrl: null },
    ...overrides,
  };
}

function skills(overrides: Partial<SkillsData> = {}): SkillsData {
  return {
    categories: [{ name: "Analytics", skills: ["SQL", "Python"] }],
    education: [{ name: "A degree", institution: "A uni", year: "2013" }],
    certifications: [
      { name: "A cert", issuer: "Body", year: "2024", url: "https://x.co" },
    ],
    ...overrides,
  };
}

describe("formatResumeMetric", () => {
  it("joins value and label", () => {
    expect(formatResumeMetric({ value: "30%", label: "faster" })).toBe(
      "30% · faster",
    );
  });
  it("keeps a bare value when there is no label", () => {
    expect(formatResumeMetric({ value: "6", label: "" })).toBe("6");
  });
  it("is null without a metric", () => {
    expect(formatResumeMetric(null)).toBeNull();
  });
});

describe("toResumeRole", () => {
  it("carries role, organisation, period and metrics", () => {
    expect(toResumeRole(role())).toEqual({
      slug: "acme-operator",
      role: "Operator",
      organisation: "Acme · Melbourne",
      period: "2020–2022",
      achievements: [
        { text: "Did a thing", metric: "30% · faster" },
        { text: "Did another", metric: null },
      ],
    });
  });
  it("drops an empty location and labels a current role as present", () => {
    const r = toResumeRole(
      role({ location: "", endDate: null, current: true }),
    );
    expect(r.organisation).toBe("Acme");
    expect(r.period).toBe("2020–present");
  });
  it("never carries the testimonial", () => {
    expect(JSON.stringify(toResumeRole(role()))).not.toContain("Great");
  });
});

describe("toResumeSkills", () => {
  it("is null without a singleton", () => {
    expect(toResumeSkills(null)).toBeNull();
  });
  it("keeps categories and education and omits certifications", () => {
    const out = toResumeSkills(skills());
    expect(out?.categories).toHaveLength(1);
    expect(out?.education).toHaveLength(1);
    expect(out).not.toHaveProperty("certifications");
  });
  it("is null when only certifications remain", () => {
    expect(
      toResumeSkills(skills({ categories: [], education: [] })),
    ).toBeNull();
  });
  it("drops categories with no skills", () => {
    const out = toResumeSkills(
      skills({ categories: [{ name: "Empty", skills: [] }] }),
    );
    expect(out?.categories).toEqual([]);
    expect(out?.education).toHaveLength(1);
  });
});

describe("buildResume", () => {
  it("preserves the reader's role order", () => {
    const model = buildResume(
      [role({ slug: "b" }), role({ slug: "a" })],
      skills(),
    );
    expect(model.experience.map((r) => r.slug)).toEqual(["b", "a"]);
  });
  it("yields empty sections when there is no data", () => {
    expect(buildResume([], null)).toEqual({ experience: [], skills: null });
  });
});

describe("resume contact details", () => {
  it("prints every address as visible text", () => {
    for (const link of RESUME_CONTACT) {
      expect(link.href.replace(/^(mailto:|https?:\/\/(www\.)?)/, "")).toContain(
        link.display,
      );
    }
  });
});
