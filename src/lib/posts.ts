import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
  readTime: string;
}

const reader = createReader(process.cwd(), keystaticConfig);

const WORDS_PER_MIN = 220;

export function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MIN));
  return `${minutes} min`;
}

/**
 * Draft gate + ordering. A post without `publishedAt` is unpublished, so it's
 * dropped here — keeping drafts off the homepage, `/notes`, and the sitemap
 * (and avoiding the dangling " · " separator a null date would render).
 * Published posts sort newest-first. Pure so Vitest can cover it with fixtures.
 */
export function selectPublished(entries: PostSummary[]): PostSummary[] {
  return entries
    .filter((entry): entry is PostSummary & { publishedAt: string } =>
      Boolean(entry.publishedAt),
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function listPosts(): Promise<PostSummary[]> {
  const slugs = await reader.collections.posts.list();
  const entries: PostSummary[] = [];
  for (const slug of slugs) {
    const post = await reader.collections.posts.read(slug);
    if (!post) continue;
    const content = await post.content();
    const prose = JSON.stringify(content);
    entries.push({
      slug,
      title: post.title,
      description: post.description ?? "",
      publishedAt: post.publishedAt,
      readTime: estimateReadTime(prose),
    });
  }
  return selectPublished(entries);
}

export async function recentPosts(limit = 4): Promise<PostSummary[]> {
  const posts = await listPosts();
  return posts.slice(0, limit);
}
