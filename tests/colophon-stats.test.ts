import { describe, expect, it } from "vitest";
import seedJson from "@/content/trail-register/stats.seed.json";
import {
  type ColophonStatsData,
  countNoMistakesRounds,
  formatHumanDate,
  formatHumanDateRange,
  type GitCommitRecord,
  hasModelCoAuthorTrailer,
  isValidColophonStats,
  meterSegments,
  type PullRequestRecord,
  summarizeGitCommits,
  summarizePullRequests,
} from "@/lib/colophon-stats";

describe("hasModelCoAuthorTrailer", () => {
  it("detects Anthropic Claude Co-authored-by trailers", () => {
    expect(
      hasModelCoAuthorTrailer(
        "feat: add colophon\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>",
      ),
    ).toBe(true);
    expect(
      hasModelCoAuthorTrailer(
        "fix: spacing\n\nCo-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>",
      ),
    ).toBe(true);
  });

  it("detects other AI model trailers by model family name", () => {
    expect(
      hasModelCoAuthorTrailer(
        "Co-authored-by: OpenAI Codex <noreply@openai.com>",
      ),
    ).toBe(true);
    expect(
      hasModelCoAuthorTrailer(
        "Co-authored-by: Gemini 2.5 Pro <noreply@google.com>",
      ),
    ).toBe(true);
  });

  it("returns false for commits without a model trailer", () => {
    expect(hasModelCoAuthorTrailer("")).toBe(false);
    expect(
      hasModelCoAuthorTrailer(
        "* feat: ship new layout\n\n* no-mistakes(review): tighten contrast",
      ),
    ).toBe(false);
    expect(
      hasModelCoAuthorTrailer(
        "Co-authored-by: Korab Eland <korab@example.com>",
      ),
    ).toBe(false);
  });
});

describe("countNoMistakesRounds", () => {
  it("counts automated review, ci, lint, document, and test rounds in a squash body", () => {
    const body = [
      "* feat(reading-room): build interactive bookshelf",
      "",
      "* no-mistakes(lint): format reading-room books schema",
      "",
      "* no-mistakes(review): align spine contrast and narrow shelf triggers",
      "",
      "* no-mistakes(ci): reseed visual baselines on linux",
      "",
      "* no-mistakes(document): sync reading-room architecture notes",
      "",
      "* no-mistakes(test): cover empty shelf state",
    ].join("\n");

    expect(countNoMistakesRounds(body)).toBe(5);
  });

  it("returns 0 when no automated pipeline lines are present", () => {
    expect(countNoMistakesRounds("")).toBe(0);
    expect(countNoMistakesRounds("feat: initial commit")).toBe(0);
  });
});

describe("summarizePullRequests", () => {
  const samplePrs: PullRequestRecord[] = [
    {
      number: 1,
      state: "closed",
      createdAt: "2026-04-11T10:00:00Z",
      mergedAt: "2026-04-11T12:00:00Z",
      closedAt: "2026-04-11T12:00:00Z",
    },
    {
      number: 27,
      state: "closed",
      createdAt: "2026-07-11T08:00:00Z",
      mergedAt: null,
      closedAt: "2026-07-11T09:00:00Z",
    },
    {
      number: 79,
      state: "closed",
      createdAt: "2026-10-16T01:00:00Z",
      mergedAt: null,
      closedAt: "2026-10-16T01:28:00Z",
    },
    {
      number: 82,
      state: "closed",
      createdAt: "2026-10-17T06:00:00Z",
      mergedAt: "2026-10-17T06:33:30Z",
      closedAt: "2026-10-17T06:33:30Z",
    },
    {
      number: 83,
      state: "open",
      createdAt: "2026-10-19T12:00:00Z",
      mergedAt: null,
      closedAt: null,
    },
  ];

  it("counts merged and closed-unmerged PRs while ignoring open PRs", () => {
    const summary = summarizePullRequests(samplePrs);
    expect(summary).toEqual({
      mergedCount: 2,
      closedUnmergedCount: 2,
      mergedRange: {
        startDate: "2026-04-11",
        endDate: "2026-10-17",
      },
      closedUnmergedRange: {
        startDate: "2026-07-11",
        endDate: "2026-10-16",
      },
    });
  });

  it("falls back to mergedRange when closedUnmergedCount is zero", () => {
    const summary = summarizePullRequests([samplePrs[0], samplePrs[3]]);
    expect(summary).toEqual({
      mergedCount: 2,
      closedUnmergedCount: 0,
      mergedRange: {
        startDate: "2026-04-11",
        endDate: "2026-10-17",
      },
      closedUnmergedRange: {
        startDate: "2026-04-11",
        endDate: "2026-10-17",
      },
    });
  });

  it("returns null when no merged pull requests exist", () => {
    expect(summarizePullRequests([])).toBeNull();
    expect(summarizePullRequests([samplePrs[1], samplePrs[4]])).toBeNull();
  });

  it("returns null on malformed ISO dates", () => {
    expect(
      summarizePullRequests([
        {
          number: 1,
          state: "closed",
          createdAt: "not-a-date",
          mergedAt: "also-bad",
          closedAt: "also-bad",
        },
      ]),
    ).toBeNull();
  });
});

describe("summarizeGitCommits", () => {
  const sampleCommits: GitCommitRecord[] = [
    {
      sha: "aaa1111",
      date: "2026-03-01",
      subject: "chore: bootstrap",
      body: "",
    },
    {
      sha: "bbb2222",
      date: "2026-03-12",
      subject: "feat: initial layout",
      body: "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>",
    },
    {
      sha: "ccc3333",
      date: "2026-08-06",
      subject: "feat: case study polish",
      body: "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>",
    },
    {
      sha: "ddd4444",
      date: "2026-10-01",
      subject: "feat: reading room (#62)",
      body: "* no-mistakes(lint): format\n* no-mistakes(review): contrast",
    },
    {
      sha: "eee5555",
      date: "2026-10-17",
      subject: "feat: tailored pages (#82)",
      body: "* no-mistakes(review): tighten copy",
    },
  ];

  it("summarizes total commits, model-trailer window, and post-trailer supervisor window", () => {
    const stats = summarizeGitCommits(sampleCommits);
    expect(stats).toEqual({
      totalCommits: 5,
      commitRange: {
        startDate: "2026-03-01",
        endDate: "2026-10-17",
      },
      modelTrailerCommits: 2,
      modelTrailerRange: {
        startDate: "2026-03-12",
        endDate: "2026-08-06",
      },
      unattributedRecentCommits: 2,
      recentRange: {
        startDate: "2026-10-01",
        endDate: "2026-10-17",
      },
      noMistakesCommits: 2,
      noMistakesRounds: 3,
    });
  });

  it("returns null on an empty commit list or invalid date/sha", () => {
    expect(summarizeGitCommits([])).toBeNull();
    expect(
      summarizeGitCommits([
        { sha: "", date: "2026-03-01", subject: "x", body: "" },
      ]),
    ).toBeNull();
    expect(
      summarizeGitCommits([
        { sha: "abc", date: "bad-date", subject: "x", body: "" },
      ]),
    ).toBeNull();
  });
});

describe("formatHumanDate and formatHumanDateRange", () => {
  it("formats a single ISO date in plain English", () => {
    expect(formatHumanDate("2026-04-11")).toBe("11 April 2026");
    expect(formatHumanDate("2026-10-01")).toBe("1 October 2026");
  });

  it("collapses identical start and end dates into a single day", () => {
    expect(
      formatHumanDateRange({
        startDate: "2026-10-17",
        endDate: "2026-10-17",
      }),
    ).toBe("17 October 2026");
  });

  it("shares month and year when both dates are in the same month", () => {
    expect(
      formatHumanDateRange({
        startDate: "2026-10-01",
        endDate: "2026-10-17",
      }),
    ).toBe("1 to 17 October 2026");
  });

  it("shares the year when both dates are in different months of the same year", () => {
    expect(
      formatHumanDateRange({
        startDate: "2026-04-11",
        endDate: "2026-10-17",
      }),
    ).toBe("11 April to 17 October 2026");
  });

  it("writes both years when the range crosses a year boundary", () => {
    expect(
      formatHumanDateRange({
        startDate: "2025-12-15",
        endDate: "2026-03-01",
      }),
    ).toBe("15 December 2025 to 1 March 2026");
  });

  it("never emits an em dash in any date range output", () => {
    const outputs = [
      formatHumanDate("2026-04-11"),
      formatHumanDateRange({ startDate: "2026-10-01", endDate: "2026-10-17" }),
      formatHumanDateRange({ startDate: "2026-04-11", endDate: "2026-10-17" }),
      formatHumanDateRange({ startDate: "2025-12-15", endDate: "2026-03-01" }),
    ];
    for (const out of outputs) {
      expect(out).not.toContain("\u2014");
    }
  });
});

describe("meterSegments", () => {
  it("splits totalWidth proportionally and rounds to integer coordinates", () => {
    const seg = meterSegments(79, 5, 1000);
    expect(seg.primaryWidth + seg.secondaryWidth).toBe(1000);
    expect(seg.secondaryX).toBe(seg.primaryWidth);
    expect(seg.primaryWidth).toBe(940);
    expect(seg.secondaryWidth).toBe(60);
    expect(seg.primaryPercent).toBe(94);
  });

  it("returns all zeros without NaN when both counts are zero", () => {
    expect(meterSegments(0, 0, 1000)).toEqual({
      primaryWidth: 0,
      secondaryWidth: 0,
      secondaryX: 0,
      primaryPercent: 0,
    });
  });
});

describe("committed stats.seed.json and isValidColophonStats", () => {
  const seed = seedJson as ColophonStatsData;

  it("passes isValidColophonStats and declares source as seed", () => {
    expect(isValidColophonStats(seed)).toBe(true);
    expect(seed.source).toBe("seed");
    expect(seed.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has positive shipped PR and commit counts with ordered date ranges", () => {
    expect(seed.pullRequests.mergedCount).toBeGreaterThan(0);
    expect(seed.pullRequests.closedUnmergedCount).toBeGreaterThanOrEqual(0);
    expect(
      seed.pullRequests.mergedRange.startDate <=
        seed.pullRequests.mergedRange.endDate,
    ).toBe(true);
    expect(seed.commits.totalCommits).toBeGreaterThan(0);
    expect(seed.commits.modelTrailerCommits).toBeGreaterThan(0);
    expect(seed.commits.modelTrailerCommits).toBeLessThanOrEqual(
      seed.commits.totalCommits,
    );
  });

  it("rejects malformed or incomplete objects", () => {
    expect(isValidColophonStats(null)).toBe(false);
    expect(isValidColophonStats({})).toBe(false);
    expect(
      isValidColophonStats({
        ...seed,
        pullRequests: { ...seed.pullRequests, mergedCount: 0 },
      }),
    ).toBe(false);
    expect(
      isValidColophonStats({
        ...seed,
        generatedAt: "not-a-date",
      }),
    ).toBe(false);
  });
});
