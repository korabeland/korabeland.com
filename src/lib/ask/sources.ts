// Turns the site's own already-read content into corpus documents. Pure: every
// input is plain data, so tests feed it fixtures; src/lib/ask/site.ts does the
// reading through the site's readers. Each document mirrors what its page
// prints, and cites only routes and element ids that page emits.

import { ABOUT_ANCHORS, aboutOperateText } from "../about";
import type { ExperienceSummary } from "../experience";
import { formatExperiencePeriod } from "../experience";
import type { ProjectSummary } from "../projects";
import { formatSpan, projectHref, projectStatus } from "../projects";
import type { SkillsData } from "../skills";
import { normalizeInline } from "./corpus";
import type { TextBlock } from "./markdoc";
import type { CorpusDocument, CorpusSection } from "./types";

/** Element ids the rendered pages emit for the sections we cite. The
 *  post-build citation check (scripts/check-corpus-citations.ts) proves
 *  these against the real HTML. */
export const ANCHORS = {
  experience: "experience-heading",
  skills: "skills-heading",
  projectOutcome: "outcome-heading",
  projectLog: "log-heading",
  projectReflection: "reflection-heading",
  ...ABOUT_ANCHORS,
} as const;

export const ABOUT_ROUTE = "/about";

const clean = (text: string) => normalizeInline(text);
const present = (text: string | null | undefined): text is string =>
  Boolean(text && clean(text));

/** Prose blocks into sections. Text before the first heading sits under
 *  `leadHeading`. Markdoc body headings render without ids, so anchors are "". */
export function sectionsFromBlocks(
  blocks: readonly TextBlock[],
  leadHeading: string,
  keyPrefix = "body",
): CorpusSection[] {
  const sections: { heading: string; paragraphs: string[] }[] = [
    { heading: leadHeading, paragraphs: [] },
  ];
  for (const block of blocks) {
    if (block.kind === "heading") {
      sections.push({ heading: clean(block.text), paragraphs: [] });
    } else {
      sections[sections.length - 1].paragraphs.push(clean(block.text));
    }
  }
  return sections
    .filter((s) => s.paragraphs.length > 0)
    .map((s, i) => ({
      key: `${keyPrefix}${i}`,
      heading: s.heading,
      anchor: "",
      paragraphs: s.paragraphs,
    }));
}

export interface NoteInput {
  slug: string;
  title: string;
  description: string;
  /** Date as the note page prints it, e.g. "2026.07.11". */
  dateLabel: string;
  body: readonly TextBlock[];
}

export function noteDocument(note: NoteInput): CorpusDocument {
  const header = [
    clean(note.title),
    present(note.description) ? clean(note.description) : "",
    note.dateLabel && note.dateLabel !== "—"
      ? `Published ${note.dateLabel}.`
      : "",
  ].filter(Boolean);
  return {
    docId: `note:${note.slug}`,
    route: `/notes/${note.slug}`,
    kind: "note",
    sections: [
      { key: "head", heading: note.title, anchor: "", paragraphs: header },
      ...sectionsFromBlocks(note.body, note.title),
    ],
  };
}

export interface ProjectInput {
  project: ProjectSummary;
  body: readonly TextBlock[];
}

export function projectLedgerDocument(
  projects: readonly ProjectSummary[],
  category: ProjectSummary["category"],
): CorpusDocument {
  const route = category === "side" ? "/lab" : "/work";
  return {
    docId: `project-ledger:${category}`,
    route,
    kind: "project",
    sections: [
      {
        key: "outcomes",
        heading: "Project outcomes",
        anchor: "",
        paragraphs: projects
          .filter(
            (project) =>
              project.category === category && present(project.outcome),
          )
          .map(
            (project) => `${clean(project.title)}: ${clean(project.outcome)}`,
          ),
      },
    ],
  };
}

export function projectDocument({
  project,
  body,
}: ProjectInput): CorpusDocument {
  const span = formatSpan(project.startedAt, project.shippedAt);
  const status = projectStatus(project) === "shipped" ? "shipped" : "in flight";
  const facts = [
    present(project.role) ? `Role: ${clean(project.role)}.` : "",
    present(project.team) ? `Team: ${clean(project.team)}.` : "",
    present(project.stack) ? `Stack: ${clean(project.stack)}.` : "",
    span ? `Span: ${span}.` : "",
    `Status: ${status}.`,
  ].filter(Boolean);
  const kind = project.category === "side" ? "Lab project" : "Case study";

  const sections: CorpusSection[] = [
    {
      key: "facts",
      heading: project.title,
      anchor: "",
      paragraphs: [
        `${kind}: ${clean(project.title)}`,
        ...(present(project.description) ? [clean(project.description)] : []),
        facts.join(" "),
      ],
    },
    ...sectionsFromBlocks(body, project.title),
  ];

  if (project.outcomeMetrics.length > 0) {
    sections.push({
      key: "outcome",
      heading: "Outcome",
      anchor: ANCHORS.projectOutcome,
      paragraphs: project.outcomeMetrics.map(
        (m) =>
          `${clean(m.label)}: ${clean(m.value)}. Basis: ${clean(m.provenance)}`,
      ),
    });
  }
  const log = project.fieldLog.filter(
    (f) => present(f.body) || present(f.title),
  );
  if (log.length > 0) {
    sections.push({
      key: "log",
      heading: "Field log",
      anchor: ANCHORS.projectLog,
      paragraphs: log.map((f) => clean(`${f.week}: ${f.title}. ${f.body}`)),
    });
  }
  if (present(project.reflection)) {
    sections.push({
      key: "reflection",
      heading: "Reflection",
      anchor: ANCHORS.projectReflection,
      paragraphs: [clean(project.reflection)],
    });
  }

  return {
    docId: `project:${project.slug}`,
    route: projectHref(project),
    kind: "project",
    sections,
  };
}

export function experienceDocument(
  roles: readonly ExperienceSummary[],
): CorpusDocument {
  return {
    docId: "experience",
    route: ABOUT_ROUTE,
    kind: "experience",
    sections: roles.map((role) => {
      const where = [role.company, role.location].filter(Boolean).join(", ");
      const period = formatExperiencePeriod(role);
      const idLine = `${clean(role.role)} at ${clean(where)}, ${period}${role.current ? " (current role)" : ""}.`;
      const paragraphs = [
        idLine,
        ...role.achievements.map((a) => {
          const metric = a.metric
            ? a.metric.label
              ? ` (${clean(a.metric.value)} · ${clean(a.metric.label)})`
              : ` (${clean(a.metric.value)})`
            : "";
          return `${clean(a.text)}${metric}`;
        }),
        ...(role.testimonial
          ? [
              `Recommendation${role.testimonial.attribution ? ` from ${clean(role.testimonial.attribution)}` : ""}: "${clean(role.testimonial.quote)}"`,
            ]
          : []),
      ];
      return {
        key: role.slug,
        heading: `${clean(role.role)}, ${clean(role.company)}`,
        anchor: ANCHORS.experience,
        paragraphs,
      };
    }),
  };
}

export function skillsDocument(data: SkillsData): CorpusDocument {
  const sections: CorpusSection[] = [];
  if (data.categories.length > 0) {
    sections.push({
      key: "skills",
      heading: "Skills",
      anchor: ANCHORS.skills,
      paragraphs: data.categories.map(
        (c) => `${clean(c.name)}: ${c.skills.map(clean).join(", ")}.`,
      ),
    });
  }
  if ((data.education?.length ?? 0) > 0) {
    sections.push({
      key: "education",
      heading: "Education",
      anchor: ANCHORS.skills,
      paragraphs: (data.education ?? []).map((e) =>
        [clean(e.name), e.institution, e.year]
          .filter(present)
          .map(clean)
          .join(", ")
          .concat("."),
      ),
    });
  }
  if (data.certifications.length > 0) {
    sections.push({
      key: "certifications",
      heading: "Certifications",
      anchor: ANCHORS.skills,
      paragraphs: data.certifications.map((c) =>
        [clean(c.name), c.issuer, c.year]
          .filter(present)
          .map(clean)
          .join(", ")
          .concat("."),
      ),
    });
  }
  return { docId: "skills", route: ABOUT_ROUTE, kind: "skills", sections };
}

export function aboutDocument(narrative: readonly string[]): CorpusDocument {
  return {
    docId: "about",
    route: ABOUT_ROUTE,
    kind: "about",
    sections: [
      {
        key: "narrative",
        heading: "Career narrative",
        anchor: ANCHORS.narrative,
        paragraphs: narrative.map(clean),
      },
      {
        key: "operate",
        heading: "How I operate",
        anchor: ANCHORS.operate,
        paragraphs: [clean(aboutOperateText())],
      },
    ],
  };
}

export interface StatusInput {
  base: string;
  citizenship: string;
}

/** Location and citizenship, as the About page's closing line prints them. */
export function statusDocument(status: StatusInput): CorpusDocument {
  return {
    docId: "status",
    route: ABOUT_ROUTE,
    kind: "status",
    sections: [
      {
        key: "location",
        heading: "Location and citizenship",
        anchor: ANCHORS.close,
        paragraphs: [`Based in ${status.base}. ${status.citizenship}.`],
      },
    ],
  };
}
