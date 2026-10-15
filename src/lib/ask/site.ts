// Reads the live site content through the site's own readers (so publication
// rules, ordering and work/lab links come from the same code the pages use)
// and assembles the corpus. The only impure part of the ask pipeline; the
// logic it feeds is in sources.ts and corpus.ts.

import { ABOUT_NARRATIVE } from "../about";
import { listExperience } from "../experience";
import { formatNoteDate, listPosts, readPost } from "../posts";
import { listProjects, projectHref, readProject } from "../projects";
import { readSkills } from "../skills";
import { STATUS } from "../status";
import {
  assertValidCorpus,
  computeCorpusRevision,
  MAX_PASSAGE_CHARS,
  passagesFromDocuments,
  type ValidationRules,
} from "./corpus";
import { blocksFromMarkdoc } from "./markdoc";
import {
  ABOUT_ROUTE,
  ANCHORS,
  aboutDocument,
  experienceDocument,
  noteDocument,
  projectDocument,
  projectLedgerDocument,
  skillsDocument,
  statusDocument,
} from "./sources";
import {
  CORPUS_SCHEMA_VERSION,
  type CorpusArtifact,
  type CorpusDocument,
} from "./types";

export async function buildSiteCorpus(): Promise<CorpusArtifact> {
  const documents: CorpusDocument[] = [];
  const routes = new Set<string>([ABOUT_ROUTE]);
  const anchors = new Map<string, Set<string>>([
    [
      ABOUT_ROUTE,
      new Set([
        ANCHORS.narrative,
        ANCHORS.operate,
        ANCHORS.close,
        ANCHORS.experience,
        ANCHORS.skills,
      ]),
    ],
  ]);

  for (const post of await listPosts()) {
    const entry = await readPost(post.slug);
    if (!entry)
      throw new Error(`ask corpus: published note "${post.slug}" has no entry`);
    const doc = noteDocument({
      slug: post.slug,
      title: post.title,
      description: post.description,
      dateLabel: formatNoteDate(post.publishedAt),
      body: blocksFromMarkdoc(await entry.content()),
    });
    routes.add(doc.route);
    documents.push(doc);
  }

  const projects = await listProjects();
  routes.add("/work");
  routes.add("/lab");
  documents.push(
    projectLedgerDocument(projects, "work"),
    projectLedgerDocument(projects, "side"),
  );

  for (const project of projects) {
    const entry = await readProject(project.slug);
    if (!entry)
      throw new Error(`ask corpus: project "${project.slug}" has no entry`);
    const doc = projectDocument({
      project,
      body: blocksFromMarkdoc(await entry.content()),
    });
    routes.add(doc.route);
    anchors.set(
      projectHref(project),
      new Set([
        ANCHORS.projectOutcome,
        ANCHORS.projectLog,
        ANCHORS.projectReflection,
      ]),
    );
    documents.push(doc);
  }

  const experience = await listExperience();
  if (experience.length > 0) documents.push(experienceDocument(experience));
  const skills = await readSkills();
  if (skills) documents.push(skillsDocument(skills));
  documents.push(aboutDocument(ABOUT_NARRATIVE));
  documents.push(statusDocument(STATUS));

  const passages = passagesFromDocuments(documents, MAX_PASSAGE_CHARS);
  const rules: ValidationRules = {
    maxChars: MAX_PASSAGE_CHARS,
    routes,
    anchors,
  };
  assertValidCorpus(passages, rules);

  return {
    schemaVersion: CORPUS_SCHEMA_VERSION,
    corpusRevision: computeCorpusRevision(passages),
    maxPassageChars: MAX_PASSAGE_CHARS,
    passages,
  };
}
