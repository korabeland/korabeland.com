import { describe, expect, it } from "vitest";
import {
  estimateReadTime,
  type PostSummary,
  selectPublished,
} from "@/lib/posts";

function post(overrides: Partial<PostSummary> = {}): PostSummary {
  return {
    slug: "a-post",
    title: "A post",
    description: "",
    publishedAt: "2026-01-01",
    readTime: "1 min",
    ...overrides,
  };
}

describe("selectPublished — draft gate", () => {
  it("drops posts with no publishedAt", () => {
    const result = selectPublished([
      post({ slug: "draft", publishedAt: null }),
      post({ slug: "live", publishedAt: "2026-01-01" }),
    ]);
    expect(result.map((p) => p.slug)).toEqual(["live"]);
  });

  it("drops posts with an empty-string publishedAt", () => {
    const result = selectPublished([
      post({ slug: "empty", publishedAt: "" }),
      post({ slug: "live", publishedAt: "2026-01-01" }),
    ]);
    expect(result.map((p) => p.slug)).toEqual(["live"]);
  });

  it("keeps every published post when none are drafts", () => {
    const result = selectPublished([
      post({ slug: "a", publishedAt: "2026-01-01" }),
      post({ slug: "b", publishedAt: "2026-02-01" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when all posts are drafts", () => {
    const result = selectPublished([
      post({ slug: "d1", publishedAt: null }),
      post({ slug: "d2", publishedAt: null }),
    ]);
    expect(result).toEqual([]);
  });
});

describe("selectPublished — ordering", () => {
  it("sorts published posts newest-first", () => {
    const result = selectPublished([
      post({ slug: "old", publishedAt: "2025-06-01" }),
      post({ slug: "new", publishedAt: "2026-07-01" }),
      post({ slug: "mid", publishedAt: "2026-01-15" }),
    ]);
    expect(result.map((p) => p.slug)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      post({ slug: "old", publishedAt: "2025-06-01" }),
      post({ slug: "new", publishedAt: "2026-07-01" }),
    ];
    const before = input.map((p) => p.slug);
    selectPublished(input);
    expect(input.map((p) => p.slug)).toEqual(before);
  });
});

describe("estimateReadTime", () => {
  it("rounds words at 220 wpm to whole minutes", () => {
    // 440 words → exactly 2 min.
    expect(estimateReadTime("word ".repeat(440).trim())).toBe("2 min");
  });

  it("floors at 1 min for very short text", () => {
    expect(estimateReadTime("just a few words")).toBe("1 min");
  });

  it("treats empty text as 1 min, never 0", () => {
    expect(estimateReadTime("")).toBe("1 min");
    expect(estimateReadTime("   ")).toBe("1 min");
  });

  it("collapses arbitrary whitespace when counting words", () => {
    // 220 words separated by mixed whitespace → 1 min (round(220/220)=1).
    const text = Array.from({ length: 220 }, () => "w").join("\n\t  ");
    expect(estimateReadTime(text)).toBe("1 min");
  });
});
