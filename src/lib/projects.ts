import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface ProjectFactsMetric {
  value: string;
  label: string;
}
export interface ProjectFieldLogEntry {
  week: string;
  title: string;
  body: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  description: string;
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
      role: project.role ?? "",
      team: project.team ?? "",
      stack: project.stack ?? "",
      outcome: project.outcome ?? "",
      startedAt: project.startedAt,
      shippedAt: project.shippedAt,
      heroImage: project.heroImage,
      tags: [...project.tags],
      outcomeMetrics: project.outcomeMetrics.map((m) => ({
        value: m.value,
        label: m.label,
      })),
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
