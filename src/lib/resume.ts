// Pure model for the one-page /resume. Every fact on the page comes from the
// experience collection and the skills singleton (read through
// src/lib/experience.ts and src/lib/skills.ts, the same readers the About page
// uses) or from the constants below. This module has no reader import, so
// Vitest covers it with plain fixtures.

import {
  type ExperienceAchievement,
  type ExperienceSummary,
  formatExperiencePeriod,
} from "./experience";
import type { Education, SkillCategory, SkillsData } from "./skills";
import { STATUS } from "./status";

/**
 * Identity block. The site has no shared module for these, so they live here
 * and mirror the home page: the headline is the hero h1 and the summary is the
 * hero sub line's first two sentences, the contact links are the hero social
 * links. tests/resume-sync.test.ts fails if the home page stops carrying them.
 */
export const RESUME_IDENTITY = {
  name: "Korab Eland",
  headline: "I turn ambiguous problems into systems that ship.",
  summary:
    "13 years across marketing, CX and operations. Now building AI systems for the same problems.",
  location: STATUS.base,
} as const;

export interface ResumeContactLink {
  label: string;
  /** Address as printed. Always visible text, so paper keeps the URL. */
  display: string;
  href: string;
}

export const RESUME_CONTACT: readonly ResumeContactLink[] = [
  {
    label: "Email",
    display: "hello@korabeland.com",
    href: "mailto:hello@korabeland.com",
  },
  {
    label: "LinkedIn",
    display: "linkedin.com/in/korabeland",
    href: "https://www.linkedin.com/in/korabeland",
  },
  {
    label: "GitHub",
    display: "github.com/korabeland",
    href: "https://github.com/korabeland",
  },
  {
    label: "X",
    display: "x.com/korabeland",
    href: "https://x.com/korabeland",
  },
];

export interface ResumeAchievement {
  text: string;
  /** "value · label" (or just the value), null when the bullet has no metric. */
  metric: string | null;
}

export interface ResumeRole {
  slug: string;
  role: string;
  /** Company and location, joined for one line. */
  organisation: string;
  period: string;
  achievements: ResumeAchievement[];
}

export interface ResumeSkills {
  categories: SkillCategory[];
  education: Education[];
}

export interface ResumeModel {
  experience: ResumeRole[];
  /** Null when the singleton has nothing the resume shows. */
  skills: ResumeSkills | null;
}

export function formatResumeMetric(
  metric: ExperienceAchievement["metric"],
): string | null {
  if (!metric) return null;
  return metric.label ? `${metric.value} · ${metric.label}` : metric.value;
}

/**
 * Resume view of one role. Testimonials and tags are dropped on purpose: the
 * page has to fit one printed sheet.
 */
export function toResumeRole(role: ExperienceSummary): ResumeRole {
  return {
    slug: role.slug,
    role: role.role,
    organisation: [role.company, role.location].filter(Boolean).join(" · "),
    period: formatExperiencePeriod(role),
    achievements: role.achievements.map((a) => ({
      text: a.text,
      metric: formatResumeMetric(a.metric),
    })),
  };
}

/**
 * Skills the resume shows: categories and education. Certifications are left
 * out because their links are long and the page is one sheet. Null when
 * neither remains, so the section is skipped instead of rendered empty.
 */
export function toResumeSkills(data: SkillsData | null): ResumeSkills | null {
  if (!data) return null;
  const categories = data.categories.filter((c) => c.skills.length > 0);
  const education = data.education ?? [];
  if (categories.length === 0 && education.length === 0) return null;
  return { categories, education };
}

/** Experience arrives already sorted by the reader; order is preserved. */
export function buildResume(
  roles: ExperienceSummary[],
  skills: SkillsData | null,
): ResumeModel {
  return {
    experience: roles.map(toResumeRole),
    skills: toResumeSkills(skills),
  };
}
