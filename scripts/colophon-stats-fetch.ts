// Build-time GitHub pull-request fetch and full-clone git-log reader behind
// the colophon's "Built with AI, decided by me" stats. Mirrors
// scripts/shift-log-fetch.ts: every external call is injectable and returns
// null on ANY failure (timeout, non-200, shallow clone, bad shape) so the
// caller can fall back to the committed seed without failing the build.

import { execFileSync } from "node:child_process";
import type {
  GitCommitRecord,
  GitStats,
  PullRequestRecord,
  PullRequestStats,
} from "../src/lib/colophon-stats";
import {
  summarizeGitCommits,
  summarizePullRequests,
} from "../src/lib/colophon-stats";

export const FETCH_TIMEOUT_MS = 15_000;
const PER_PAGE = 100;
const MAX_PAGES = 10;
const PULLS_API_URL =
  "https://api.github.com/repos/korabeland/korabeland.com/pulls";

export interface FetchPullRequestStatsOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface RawPullRequest {
  number?: unknown;
  state?: unknown;
  created_at?: unknown;
  merged_at?: unknown;
  closed_at?: unknown;
}

function parseRawPullRequest(raw: unknown): PullRequestRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as RawPullRequest;
  if (
    typeof item.number !== "number" ||
    (item.state !== "open" && item.state !== "closed") ||
    typeof item.created_at !== "string" ||
    (item.merged_at !== null && typeof item.merged_at !== "string") ||
    (item.closed_at !== null && typeof item.closed_at !== "string")
  ) {
    return null;
  }
  return {
    number: item.number,
    state: item.state,
    createdAt: item.created_at,
    mergedAt: item.merged_at,
    closedAt: item.closed_at,
  };
}

/**
 * Fetches all pull requests for korabeland/korabeland.com from the public
 * GitHub REST API and summarizes merged vs closed-unmerged counts. Uses
 * `GITHUB_CONTRIB_TOKEN` when present for higher rate limits, and also works
 * unauthenticated since the repo is public. Returns null on ANY failure.
 */
export async function fetchPullRequestStats(
  token: string | null,
  {
    fetchImpl = fetch,
    timeoutMs = FETCH_TIMEOUT_MS,
  }: FetchPullRequestStatsOptions = {},
): Promise<PullRequestStats | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "korabeland.com-colophon-stats",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const records: PullRequestRecord[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let json: unknown;
    try {
      const url = `${PULLS_API_URL}?state=all&per_page=${PER_PAGE}&page=${page}`;
      const resp = await fetchImpl(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!resp.ok) {
        console.warn(
          `gen-trail-register: GitHub pulls API returned HTTP ${resp.status}`,
        );
        return null;
      }
      json = await resp.json();
    } catch (err) {
      const timedOut = (err as Error).name === "TimeoutError";
      console.warn(
        timedOut
          ? `gen-trail-register: pulls fetch timed out after ${timeoutMs}ms`
          : `gen-trail-register: pulls fetch failed: ${(err as Error).message}`,
      );
      return null;
    }

    if (!Array.isArray(json)) {
      console.warn("gen-trail-register: pulls response is not an array");
      return null;
    }

    for (const rawItem of json) {
      const parsed = parseRawPullRequest(rawItem);
      if (!parsed) {
        console.warn(
          "gen-trail-register: malformed pull-request item; rejecting",
        );
        return null;
      }
      records.push(parsed);
    }

    if (json.length < PER_PAGE) {
      break;
    }
  }

  const summary = summarizePullRequests(records);
  if (!summary) {
    console.warn("gen-trail-register: no merged pull requests in response");
    return null;
  }
  return summary;
}

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

export type ExecGitFn = (args: string[], cwd: string) => string;

const defaultExecGit: ExecGitFn = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

/**
 * Reads full commit history from local git log when the repository is NOT a
 * shallow clone. On a shallow clone (e.g. Vercel's default depth-10 checkout),
 * returns null so the caller preserves the committed full-history seed rather
 * than undercounting ~10 commits as the entire repository.
 */
export function readGitCommitStats(
  repoRoot: string,
  execGit: ExecGitFn = defaultExecGit,
): GitStats | null {
  try {
    const shallow = execGit(
      ["rev-parse", "--is-shallow-repository"],
      repoRoot,
    ).trim();
    if (shallow !== "false") {
      console.warn(
        "gen-trail-register: shallow git clone detected; using seed for full-history commit stats",
      );
      return null;
    }

    const stdout = execGit(
      [
        "log",
        "--date=short",
        `--format=%H${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`,
      ],
      repoRoot,
    );

    const rawRecords = stdout
      .split(RECORD_SEP)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawRecords.length === 0) return null;

    const commits: GitCommitRecord[] = [];
    for (const rec of rawRecords) {
      const parts = rec.split(FIELD_SEP);
      if (parts.length !== 4) return null;
      const [sha, date, subject, body] = parts;
      commits.push({ sha, date, subject, body });
    }

    return summarizeGitCommits(commits);
  } catch {
    return null;
  }
}
