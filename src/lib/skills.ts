import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface SkillCategory {
  name: string;
  skills: string[];
}
export interface Certification {
  name: string;
  issuer: string;
  year: string;
  url: string | null;
}
export interface Education {
  name: string;
  institution: string;
  year: string;
}
export interface SkillsData {
  education?: Education[];
  categories: SkillCategory[];
  certifications: Certification[];
}

/**
 * The subset of the Keystatic `skills` singleton the reader returns, with the
 * same nullability. Declared explicitly so `mapSkills` is testable with plain
 * fixtures instead of a live filesystem reader.
 */
export interface RawSkills {
  education?: readonly {
    name: string;
    institution: string | null;
    year: string | null;
  }[];
  categories: readonly { name: string; skills: readonly string[] }[];
  certifications: readonly {
    name: string;
    issuer: string | null;
    year: string | null;
    url: string | null;
  }[];
}

export function mapSkills(raw: RawSkills): SkillsData {
  return {
    categories: raw.categories.map((c) => ({
      name: c.name,
      skills: [...c.skills],
    })),
    education: (raw.education ?? []).map((e) => ({
      name: e.name,
      institution: e.institution ?? "",
      year: e.year ?? "",
    })),
    certifications: raw.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? "",
      year: c.year ?? "",
      url: c.url ?? null,
    })),
  };
}

/**
 * A singleton that exists but carries no categories, education or certifications is
 * treated as absent — the section is content-gated, so callers skip it rather
 * than render an empty scaffold.
 */
export function hasSkillsContent(data: SkillsData): boolean {
  return (
    data.categories.length > 0 ||
    data.certifications.length > 0 ||
    (data.education?.length ?? 0) > 0
  );
}

const reader = createReader(process.cwd(), keystaticConfig);

export async function readSkills(): Promise<SkillsData | null> {
  const raw = await reader.singletons.skills.read();
  if (!raw) return null;
  const data = mapSkills(raw);
  return hasSkillsContent(data) ? data : null;
}
