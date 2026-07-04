import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import { type ExperienceSummary, listExperience } from "./experience";
import { listProjects, type ProjectSummary } from "./projects";
import { readSkills, type SkillCategory } from "./skills";

/** A tailored page's stored config: explicit, ordered references into the pool
 *  (never tag queries) plus the one piece of free-form copy, the intro. */
export interface TailoredConfig {
  slug: string;
  displayName: string;
  intro: string;
  experienceRefs: string[];
  projectRefs: string[];
  skillCategories: string[];
}

export interface TailoredPools {
  experience: ExperienceSummary[];
  projects: ProjectSummary[];
  skills: { categories: SkillCategory[] } | null;
}

export interface ResolvedTailored {
  slug: string;
  displayName: string;
  intro: string;
  experience: ExperienceSummary[];
  projects: ProjectSummary[];
  skillCategories: SkillCategory[];
}

/**
 * Resolve a tailored config against the content pool. Fails loud: throws — with
 * a message naming the offending ref — on any dangling reference, and throws if
 * the config resolves to no content at all. A broken build beats a hollow page
 * in a recruiter's inbox.
 */
export function resolveTailored(
  config: TailoredConfig,
  pools: TailoredPools,
): ResolvedTailored {
  const experience = config.experienceRefs.map((slug) => {
    const found = pools.experience.find((e) => e.slug === slug);
    if (!found) {
      throw new Error(
        `Tailored page "${config.slug}" references unknown experience "${slug}".`,
      );
    }
    return found;
  });

  const projects = config.projectRefs.map((slug) => {
    const found = pools.projects.find((p) => p.slug === slug);
    if (!found) {
      throw new Error(
        `Tailored page "${config.slug}" references unknown case study "${slug}".`,
      );
    }
    return found;
  });

  const skillCategories = config.skillCategories.map((name) => {
    const found = pools.skills?.categories.find((c) => c.name === name);
    if (!found) {
      throw new Error(
        `Tailored page "${config.slug}" references unknown skill category "${name}".`,
      );
    }
    return found;
  });

  if (
    experience.length === 0 &&
    projects.length === 0 &&
    skillCategories.length === 0
  ) {
    throw new Error(
      `Tailored page "${config.slug}" resolves to no content — refusing to build a hollow page.`,
    );
  }

  return {
    slug: config.slug,
    displayName: config.displayName,
    intro: config.intro,
    experience,
    projects,
    skillCategories,
  };
}

const reader = createReader(process.cwd(), keystaticConfig);

export async function listTailoredSlugs(): Promise<string[]> {
  return [...(await reader.collections.tailored.list())];
}

/**
 * Read and resolve a tailored page. Assembles the pools from the readers, then
 * resolves fail-loud. Throws at build time (prerender) on any dangling ref.
 */
export async function readTailored(
  slug: string,
): Promise<ResolvedTailored | null> {
  const entry = await reader.collections.tailored.read(slug);
  if (!entry) return null;

  const config: TailoredConfig = {
    slug,
    displayName: entry.displayName,
    intro: entry.intro,
    experienceRefs: entry.experienceRefs.filter((s): s is string => s !== null),
    projectRefs: entry.projectRefs.filter((s): s is string => s !== null),
    skillCategories: [...entry.skillCategories],
  };

  const [experience, projects, skills] = await Promise.all([
    listExperience(),
    listProjects(),
    readSkills(),
  ]);

  return resolveTailored(config, { experience, projects, skills });
}
