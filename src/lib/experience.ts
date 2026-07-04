import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface ExperienceMetric {
  value: string;
  label: string;
}
export interface ExperienceAchievement {
  text: string;
  metric: ExperienceMetric | null;
}
export interface ExperienceTestimonial {
  quote: string;
  attribution: string;
  sourceUrl: string | null;
}
export interface ExperienceSummary {
  slug: string;
  company: string;
  role: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  achievements: ExperienceAchievement[];
  tags: string[];
  testimonial: ExperienceTestimonial | null;
}

/**
 * The subset of a Keystatic `experience` entry the reader returns, with the
 * same nullability. Declared explicitly so the pure mappers below are testable
 * with plain fixtures instead of a live filesystem reader.
 */
export interface RawExperienceEntry {
  company: string;
  role: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  achievements: readonly {
    text: string;
    metricValue: string | null;
    metricLabel: string | null;
  }[];
  tags: readonly string[];
  testimonial: {
    quote: string | null;
    attribution: string | null;
    sourceUrl: string | null;
  };
}

/**
 * Map one raw entry to a template-ready summary. Coalesces every optional field
 * so `undefined`/`null` never leaks into markup, lifts a bullet's optional
 * highlight metric only when it carries a value, and drops the testimonial
 * entirely when there is no quote.
 */
export function mapExperienceEntry(
  slug: string,
  raw: RawExperienceEntry,
): ExperienceSummary {
  const quote = raw.testimonial.quote ?? "";
  return {
    slug,
    company: raw.company,
    role: raw.role,
    location: raw.location ?? "",
    startDate: raw.startDate,
    endDate: raw.endDate,
    current: !raw.endDate,
    achievements: raw.achievements.map((a) => {
      const value = a.metricValue ?? "";
      return {
        text: a.text,
        metric: value ? { value, label: a.metricLabel ?? "" } : null,
      };
    }),
    tags: [...raw.tags],
    testimonial: quote
      ? {
          quote,
          attribution: raw.testimonial.attribution ?? "",
          sourceUrl: raw.testimonial.sourceUrl ?? null,
        }
      : null,
  };
}

/**
 * Reverse-chronological by start date, with current roles (no end date) floated
 * to the top. Pure and non-mutating.
 */
export function sortExperience(
  entries: ExperienceSummary[],
): ExperienceSummary[] {
  return [...entries].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    const ad = a.startDate ?? "";
    const bd = b.startDate ?? "";
    return bd.localeCompare(ad);
  });
}

const reader = createReader(process.cwd(), keystaticConfig);

export async function listExperience(): Promise<ExperienceSummary[]> {
  const slugs = await reader.collections.experience.list();
  const entries: ExperienceSummary[] = [];
  for (const slug of slugs) {
    const raw = await reader.collections.experience.read(slug);
    if (!raw) continue;
    entries.push(mapExperienceEntry(slug, raw));
  }
  return sortExperience(entries);
}

export async function readExperience(slug: string) {
  return reader.collections.experience.read(slug);
}
