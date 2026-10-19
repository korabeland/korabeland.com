// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import seedJson from "@/content/trail-register/stats.seed.json";
import { isValidColophonStats } from "@/lib/colophon-stats";
import {
  FETCH_TIMEOUT_MS,
  fetchPullRequestStats,
  readGitCommitStats,
} from "../scripts/colophon-stats-fetch";

function stalledFetch(): typeof fetch {
  return ((_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(init.signal?.reason),
      );
    })) as typeof fetch;
}

describe("fetchPullRequestStats", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives up on a stalled request once the timeout elapses", async () => {
    const started = Date.now();
    const result = await fetchPullRequestStats("token", {
      fetchImpl: stalledFetch(),
      timeoutMs: 50,
    });
    expect(result).toBeNull();
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(console.warn).toHaveBeenCalledWith(
      "gen-trail-register: pulls fetch timed out after 50ms",
    );
  });

  it("passes Authorization header when a token is provided and omits it when null", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([
        {
          number: 1,
          state: "closed",
          created_at: "2026-04-11T10:00:00Z",
          merged_at: "2026-04-11T12:00:00Z",
          closed_at: "2026-04-11T12:00:00Z",
        },
      ]),
    );

    await fetchPullRequestStats("secret-token", { fetchImpl });
    const withTokenInit = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(
      (withTokenInit[1].headers as Record<string, string>).Authorization,
    ).toBe("Bearer secret-token");
    expect(withTokenInit[1].signal).toBeInstanceOf(AbortSignal);

    await fetchPullRequestStats(null, { fetchImpl });
    const withoutTokenInit = fetchImpl.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(
      (withoutTokenInit[1].headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  });

  it("returns null on non-200 responses, network errors, or malformed items", async () => {
    const non200 = (async () =>
      new Response("rate limited", { status: 403 })) as typeof fetch;
    await expect(
      fetchPullRequestStats(null, { fetchImpl: non200 }),
    ).resolves.toBeNull();

    const networkErr = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(
      fetchPullRequestStats(null, { fetchImpl: networkErr }),
    ).resolves.toBeNull();

    const badShape = (async () =>
      Response.json([{ number: "not-a-number" }])) as typeof fetch;
    await expect(
      fetchPullRequestStats(null, { fetchImpl: badShape }),
    ).resolves.toBeNull();
  });

  it("paginates across pages when a page returns 100 items", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      state: "closed",
      created_at: "2026-05-01T00:00:00Z",
      merged_at: "2026-05-01T01:00:00Z",
      closed_at: "2026-05-01T01:00:00Z",
    }));
    const page2 = [
      {
        number: 101,
        state: "closed",
        created_at: "2026-10-16T00:00:00Z",
        merged_at: null,
        closed_at: "2026-10-16T01:00:00Z",
      },
    ];

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(Response.json(page1))
      .mockResolvedValueOnce(Response.json(page2));

    const result = await fetchPullRequestStats(null, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      mergedCount: 100,
      closedUnmergedCount: 1,
      mergedRange: { startDate: "2026-05-01", endDate: "2026-05-01" },
      closedUnmergedRange: { startDate: "2026-10-16", endDate: "2026-10-16" },
    });
  });

  it("keeps the default timeout between 10s and 30s", () => {
    expect(FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    expect(FETCH_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});

describe("readGitCommitStats", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when git reports a shallow clone so the caller uses the full-history seed", () => {
    const execGit = vi.fn(() => "true\n");
    expect(readGitCommitStats("/repo", execGit)).toBeNull();
    expect(execGit).toHaveBeenCalledTimes(1);
    expect(execGit).toHaveBeenCalledWith(
      ["rev-parse", "--is-shallow-repository"],
      "/repo",
    );
  });

  it("parses formatted git log output when the checkout is full history", () => {
    const logOut = [
      [
        "1111111",
        "2026-03-12",
        "feat: first",
        "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>",
      ].join("\x1f"),
      [
        "2222222",
        "2026-10-17",
        "feat: second",
        "* no-mistakes(review): tighten layout",
      ].join("\x1f"),
    ].join("\x1e");

    const execGit = vi.fn((args: string[]) => {
      if (args[0] === "rev-parse") return "false\n";
      return `${logOut}\x1e`;
    });

    const stats = readGitCommitStats("/repo", execGit);
    expect(stats).toEqual({
      totalCommits: 2,
      commitRange: { startDate: "2026-03-12", endDate: "2026-10-17" },
      modelTrailerCommits: 1,
      modelTrailerRange: { startDate: "2026-03-12", endDate: "2026-03-12" },
      unattributedRecentCommits: 1,
      recentRange: { startDate: "2026-10-17", endDate: "2026-10-17" },
      noMistakesCommits: 1,
      noMistakesRounds: 1,
    });
  });

  it("returns null if git throws", () => {
    const execGit = vi.fn(() => {
      throw new Error("git not found");
    });
    expect(readGitCommitStats("/repo", execGit)).toBeNull();
  });
});

describe("seed fallback integrity", () => {
  it("validates stats.seed.json against the schema contract", () => {
    expect(isValidColophonStats(seedJson)).toBe(true);
  });
});
