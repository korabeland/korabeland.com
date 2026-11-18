import { describe, expect, it } from "vitest";
import type { ExperienceSummary } from "@/lib/experience";
import {
  buildResume,
  formatResumeMetric,
  RESUME_CONTACT,
  RESUME_IDENTITY,
  RESUME_MODEL,
  RESUME_SUMMARY,
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
      period: "Jan 2020 to Jun 2022",
      summary: null,
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
    expect(r.period).toBe("Jan 2020 to present");
  });
  it("never carries the testimonial", () => {
    expect(JSON.stringify(toResumeRole(role()))).not.toContain("Great");
  });
});

describe("toResumeSkills", () => {
  it("is null without a singleton or certifications", () => {
    expect(toResumeSkills(null)).toBeNull();
  });
  it("keeps categories and education and omits Keystatic certifications by default", () => {
    const out = toResumeSkills(skills());
    expect(out?.categories).toHaveLength(1);
    expect(out?.education).toHaveLength(1);
    expect(out?.certifications).toEqual([]);
  });
  it("is null when only Keystatic certifications remain", () => {
    expect(
      toResumeSkills(skills({ categories: [], education: [] })),
    ).toBeNull();
  });
  it("keeps explicit concise certifications when passed", () => {
    const out = toResumeSkills(skills({ categories: [], education: [] }), [
      { name: "Cert", institution: "Uni", year: "2023" },
    ]);
    expect(out?.certifications).toHaveLength(1);
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
    expect(buildResume([], null)).toEqual({
      summary: null,
      experience: [],
      skills: null,
    });
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

  it("includes only public contact links and omits phone/gmail", () => {
    const serialised = JSON.stringify({ RESUME_IDENTITY, RESUME_CONTACT });
    expect(serialised).not.toMatch(/gmail\.com|\(\d{3}\)|\+\d{1,3}/i);
    expect(RESUME_IDENTITY.location).toBe(STATUS.base);
    expect(RESUME_CONTACT.map((c) => c.display)).toEqual([
      "hello@korabeland.com",
      "korabeland.com",
      "linkedin.com/in/korabeland",
      "github.com/korabeland",
      "x.com/korabeland",
    ]);
  });
});

describe("RESUME_MODEL content rules", () => {
  const fullText = JSON.stringify({
    RESUME_IDENTITY,
    RESUME_SUMMARY,
    RESUME_MODEL,
  });

  it("contains no em dashes, en dashes, or spaced hyphens", () => {
    expect(fullText).not.toContain("\u2014");
    expect(fullText).not.toContain("\u2013");
    expect(fullText).not.toMatch(/ - /);
  });

  it("aligns lead tiering with two-part-tiers-spec and omits forbidden numbers", () => {
    expect(fullText).not.toContain("25%");
    expect(fullText).not.toContain("27.8%");
    expect(fullText).not.toContain("0.7%");
    expect(fullText).not.toMatch(/predictive lead tiering/i);
    expect(fullText).not.toMatch(/Lead Tiering system using predictive/i);
    expect(fullText).toContain("about 30% to less than 1%");
    expect(fullText).toContain("handed over unlaunched in August 2026");
  });

  it("uses August 2026 end date and includes all 5 roles, 2 skill groups, 2 education, 2 certs", () => {
    expect(RESUME_MODEL.experience).toHaveLength(5);
    expect(RESUME_MODEL.experience[0]?.period).toBe("Mar 2021 to Aug 2026");
    expect(RESUME_MODEL.skills?.categories).toHaveLength(2);
    expect(RESUME_MODEL.skills?.education).toHaveLength(2);
    expect(RESUME_MODEL.skills?.certifications).toHaveLength(2);
  });
});
