import { describe, expect, it } from "vitest";
import type { ExperienceSummary } from "@/lib/experience";
import type { ProjectSummary } from "@/lib/projects";
import {
  resolveTailored,
  type TailoredConfig,
  type TailoredPools,
} from "@/lib/tailored";

const pools: TailoredPools = {
  experience: [
    { slug: "role-a" } as ExperienceSummary,
    { slug: "role-b" } as ExperienceSummary,
  ],
  projects: [
    { slug: "proj-a" } as ProjectSummary,
    { slug: "proj-b" } as ProjectSummary,
  ],
  skills: { categories: [{ name: "Data & AI", skills: ["SQL"] }] },
};

function config(overrides: Partial<TailoredConfig> = {}): TailoredConfig {
  return {
    slug: "acme",
    displayName: "Acme",
    intro: "Prepared for Acme.",
    experienceRefs: [],
    projectRefs: ["proj-a"],
    skillCategories: [],
    ...overrides,
  };
}

describe("resolveTailored", () => {
  it("resolves stored refs, preserving their order", () => {
    const resolved = resolveTailored(
      config({
        experienceRefs: ["role-b", "role-a"],
        projectRefs: ["proj-b", "proj-a"],
        skillCategories: ["Data & AI"],
      }),
      pools,
    );
    expect(resolved.experience.map((e) => e.slug)).toEqual([
      "role-b",
      "role-a",
    ]);
    expect(resolved.projects.map((p) => p.slug)).toEqual(["proj-b", "proj-a"]);
    expect(resolved.skillCategories.map((c) => c.name)).toEqual(["Data & AI"]);
  });

  it("throws naming a dangling experience ref", () => {
    expect(() =>
      resolveTailored(config({ experienceRefs: ["ghost"] }), pools),
    ).toThrow(/ghost/);
  });

  it("throws naming a dangling case-study ref", () => {
    expect(() =>
      resolveTailored(config({ projectRefs: ["missing-proj"] }), pools),
    ).toThrow(/missing-proj/);
  });

  it("throws naming a dangling skill category", () => {
    expect(() =>
      resolveTailored(config({ skillCategories: ["Nonexistent"] }), pools),
    ).toThrow(/Nonexistent/);
  });

  it("throws when a skill category is referenced but the singleton is empty", () => {
    expect(() =>
      resolveTailored(config({ skillCategories: ["Data & AI"] }), {
        ...pools,
        skills: null,
      }),
    ).toThrow(/Data & AI/);
  });

  it("throws when the config resolves to no content at all", () => {
    expect(() =>
      resolveTailored(
        config({ experienceRefs: [], projectRefs: [], skillCategories: [] }),
        pools,
      ),
    ).toThrow(/hollow/);
  });

  it("allows an empty experience selection when other content resolves", () => {
    const resolved = resolveTailored(
      config({ experienceRefs: [], projectRefs: ["proj-a"] }),
      pools,
    );
    expect(resolved.projects).toHaveLength(1);
    expect(resolved.experience).toHaveLength(0);
  });
});
