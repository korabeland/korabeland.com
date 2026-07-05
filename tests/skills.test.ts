import { describe, expect, it } from "vitest";
import { hasSkillsContent, mapSkills, type RawSkills } from "@/lib/skills";

function raw(overrides: Partial<RawSkills> = {}): RawSkills {
  return {
    categories: [{ name: "Data", skills: ["SQL", "Python"] }],
    certifications: [{ name: "Cert", issuer: "Org", year: "2024", url: null }],
    ...overrides,
  };
}

describe("mapSkills", () => {
  it("maps categories and their skills", () => {
    expect(mapSkills(raw()).categories).toEqual([
      { name: "Data", skills: ["SQL", "Python"] },
    ]);
  });

  it("coalesces an absent certification issuer/year to empty strings", () => {
    const d = mapSkills(
      raw({
        certifications: [{ name: "C", issuer: null, year: null, url: null }],
      }),
    );
    expect(d.certifications[0]).toEqual({
      name: "C",
      issuer: "",
      year: "",
      url: null,
    });
  });

  it("preserves a certification URL when present", () => {
    const d = mapSkills(
      raw({
        certifications: [
          { name: "C", issuer: "O", year: "2024", url: "https://example.co" },
        ],
      }),
    );
    expect(d.certifications[0].url).toBe("https://example.co");
  });
});

describe("hasSkillsContent", () => {
  it("is false with no categories and no certifications", () => {
    expect(hasSkillsContent({ categories: [], certifications: [] })).toBe(
      false,
    );
  });

  it("is true when at least one category exists", () => {
    expect(
      hasSkillsContent({
        categories: [{ name: "X", skills: [] }],
        certifications: [],
      }),
    ).toBe(true);
  });

  it("is true when at least one certification exists", () => {
    expect(
      hasSkillsContent({
        categories: [],
        certifications: [{ name: "C", issuer: "", year: "", url: null }],
      }),
    ).toBe(true);
  });
});
