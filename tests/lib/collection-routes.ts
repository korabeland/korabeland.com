import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
// Relative imports (not the "@/" alias) — this module is imported from both
// Vitest specs (which have the alias configured in vitest.config.ts) and
// Playwright specs (which have no such config), so relative paths keep
// resolution identical in both runners.
import { listPosts } from "../../src/lib/posts";
import { listProjects } from "../../src/lib/projects";

/**
 * Shared route enumeration for Playwright specs and Vitest guards. Two paths
 * exist on purpose:
 *
 * - `projectRoutes`/`postRoutes` (async) reuse the same Keystatic readers
 *   (`listProjects`, `listPosts`) the site itself reads from — the source of
 *   truth, used by Vitest guards (see tests/coverage-sync.test.ts).
 * - `projectRoutesSync`/`postRoutesSync` (sync) fs-glob the content
 *   directories directly and parse frontmatter by hand. Playwright transforms
 *   spec files to CJS, where a top-level `await` throws at collect time, so
 *   the four Playwright specs use these instead. tests/coverage-sync.test.ts
 *   asserts the two paths never drift apart (same routes, same title/
 *   description text) — that parity check is what keeps this hand-rolled
 *   parser honest against Keystatic's actual semantics.
 */

const CONTENT_ROOT = resolve(__dirname, "../../src/content");
const PROJECTS_DIR = resolve(CONTENT_ROOT, "projects");
const POSTS_DIR = resolve(CONTENT_ROOT, "posts");

export async function projectRoutes(): Promise<string[]> {
  const projects = await listProjects();
  return projects.map((p) => `/work/${p.slug}`);
}

export async function postRoutes(): Promise<string[]> {
  const posts = await listPosts();
  return posts.map((p) => `/notes/${p.slug}`);
}

export interface SyncRouteEntry {
  slug: string;
  path: string;
  title: string;
  description: string;
}

/**
 * Minimal YAML-frontmatter scalar reader — enough for this repo's two
 * conventions (plain/quoted single-line values, and `>-` folded block
 * scalars for longer text) and nothing more. Not a general YAML parser.
 */
function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const result: Record<string, string> = {};
  let i = 0;
  while (i < lines.length) {
    const keyMatch = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const [, key, rest] = keyMatch;
    if (/^[>|][-+]?$/.test(rest)) {
      // Folded (>) or literal (|) block scalar: collect the indented lines
      // that follow and join them the way YAML folding does (space-joined).
      const collected: string[] = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        collected.push(lines[i].trim());
        i++;
      }
      result[key] = collected.join(" ");
      continue;
    }
    result[key] = rest.trim().replace(/^['"]|['"]$/g, "");
    i++;
  }
  return result;
}

function listDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Projects carry no draft/publish gate in the schema (see keystatic.config.ts
// and src/lib/projects.ts — listProjects() returns every entry), so every
// directory on disk is expected to route.
export function projectRoutesSync(): SyncRouteEntry[] {
  return listDirs(PROJECTS_DIR).map((slug) => {
    const raw = readFileSync(resolve(PROJECTS_DIR, slug, "index.mdoc"), "utf8");
    const fm = parseFrontmatter(raw);
    return {
      slug,
      path: `/work/${slug}`,
      title: fm.title ?? "",
      description: fm.description ?? "",
    };
  });
}

// Posts are gated on `publishedAt` (see selectPublished in src/lib/posts.ts)
// — mirror that filter here so a draft post never gets a route.
export function postRoutesSync(): SyncRouteEntry[] {
  return listDirs(POSTS_DIR)
    .map((slug) => {
      const raw = readFileSync(resolve(POSTS_DIR, slug, "index.mdoc"), "utf8");
      const fm = parseFrontmatter(raw);
      return {
        slug,
        path: `/notes/${slug}`,
        title: fm.title ?? "",
        description: fm.description ?? "",
        publishedAt: fm.publishedAt ?? "",
      };
    })
    .filter((entry) => entry.publishedAt.length > 0)
    .map(({ publishedAt: _publishedAt, ...entry }) => entry);
}

// Non-collection routes exercised across the e2e/visual/seo suites. Kept as
// an explicit list — these are pages, not content entries, so there is
// nothing to enumerate them from.
export const staticRoutes = [
  "/",
  "/work",
  "/about",
  "/notes",
  "/colophon",
  "/off-trail",
] as const;
