import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface ProjectFactsMetric {
  value: string;
  label: string;
  provenance: string;
}
export interface ProjectFieldLogEntry {
  week: string;
  title: string;
  body: string;
}

export type ProjectCategory = "work" | "side";

export interface ProjectSummary {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  role: string;
  team: string;
  stack: string;
  outcome: string;
  startedAt: string | null;
  shippedAt: string | null;
  heroImage: string | null;
  tags: string[];
  outcomeMetrics: ProjectFactsMetric[];
  fieldLog: ProjectFieldLogEntry[];
  reflection: string;
  nextProject: string;
}

/**
 * The subset of a Keystatic `outcomeMetrics` entry the mapper needs, declared
 * explicitly so `mapMetrics` is testable with plain fixtures instead of a
 * live filesystem reader (pure-logic split per `src/lib/metric-countup.ts`).
 */
export interface RawOutcomeMetric {
  value: string;
  label: string;
  provenance: string | null;
}

/**
 * Carries `value`/`label`/`provenance` through for every metric, throwing at
 * build time when a metric lacks provenance (AE4: no metric ships without
 * provenance — enforced by the build, not review discipline).
 */
export function mapMetrics(
  slug: string,
  metrics: readonly RawOutcomeMetric[],
): ProjectFactsMetric[] {
  return metrics.map((m) => {
    const provenance = m.provenance?.trim() ?? "";
    if (!provenance) {
      throw new Error(
        `Metric "${m.label}" in project "${slug}" is missing provenance (AE4: no metric ships without provenance).`,
      );
    }
    return { value: m.value, label: m.label, provenance };
  });
}

const reader = createReader(process.cwd(), keystaticConfig);

export async function listProjects(): Promise<ProjectSummary[]> {
  const slugs = await reader.collections.projects.list();
  const entries: ProjectSummary[] = [];
  for (const slug of slugs) {
    const project = await reader.collections.projects.read(slug);
    if (!project) continue;
    entries.push({
      slug,
      title: project.title,
      description: project.description ?? "",
      category: project.category,
      role: project.role ?? "",
      team: project.team ?? "",
      stack: project.stack ?? "",
      outcome: project.outcome ?? "",
      startedAt: project.startedAt,
      shippedAt: project.shippedAt,
      heroImage: project.heroImage,
      tags: [...project.tags],
      outcomeMetrics: mapMetrics(slug, project.outcomeMetrics),
      fieldLog: project.fieldLog.map((f) => ({
        week: f.week,
        title: f.title,
        body: f.body,
      })),
      reflection: project.reflection ?? "",
      nextProject: project.nextProject ?? "",
    });
  }
  return entries.sort((a, b) => {
    const ad = a.shippedAt ?? a.startedAt ?? "";
    const bd = b.shippedAt ?? b.startedAt ?? "";
    return bd.localeCompare(ad);
  });
}

export async function readProject(slug: string) {
  return reader.collections.projects.read(slug);
}

/**
 * Base route differs by category: professional case studies live under
 * /work, AI code tinkering under /lab. Single source of truth so the two
 * lists never cross-link into each other's route.
 */
export function projectHref(
  p: Pick<ProjectSummary, "slug" | "category">,
): string {
  return `/${p.category === "side" ? "lab" : "work"}/${p.slug}`;
}

/**
 * Console status vocabulary for a case study: amber "in-flight" until it has a
 * ship date, moss "shipped" after. The single derivation the ledgers and the
 * StatusChip display share — no second source of truth.
 */
export function projectStatus(
  project: Pick<ProjectSummary, "shippedAt">,
): "shipped" | "in-flight" {
  return project.shippedAt ? "shipped" : "in-flight";
}
