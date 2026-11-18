import { describe, expect, it } from "vitest";
import {
  RESUME_CONTACT,
  RESUME_IDENTITY,
  RESUME_MODEL,
  RESUME_SUMMARY,
} from "@/lib/resume";
import { STATUS } from "@/lib/status";

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
