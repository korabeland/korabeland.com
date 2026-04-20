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

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MIN));
  return `${minutes} min`;
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
  return entries.sort((a, b) => {
    const ad = a.publishedAt ?? "";
    const bd = b.publishedAt ?? "";
    return bd.localeCompare(ad);
  });
}

export async function recentPosts(limit = 4): Promise<PostSummary[]> {
  const posts = await listPosts();
  return posts.slice(0, limit);
}
