// The GitHub contribution-calendar fetch + validation behind gen-shift-log.ts,
// split out so Vitest can drive the failure paths (timeout, bad shape) with an
// injected fetch. No filesystem access here: the caller owns the seed fallback.

// No login constant: the live path queries `viewer`, so the account is
// whoever owns GITHUB_CONTRIB_TOKEN (Korab). The seed is a fixed committed file.
const CONTRIBUTION_LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
] as const;

interface RawDay {
  date: string;
  contributionCount: number;
  contributionLevel: string;
}

// The response is validated at runtime before use; this type makes the
// optional-chained navigation compile without asserting the data is present.
interface GraphQLCalendarResponse {
  data?: {
    viewer?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: { contributionDays: RawDay[] }[];
        };
      };
    };
  };
}

// `viewer`, NOT `user(login:)`. The public `user(login:)` calendar returns
// PUBLIC contributions only, regardless of token — so it would ignore private
// work entirely. `viewer` resolves to the token owner and includes PRIVATE
// contribution counts *iff* "Include private contributions on my profile" is
// enabled in GitHub profile settings. Both the query and that setting are
// load-bearing: flip one without the other and private work stays invisible.
// (The tokenless path copies a committed public seed — public-only by nature —
// so private counts only ever appear on the live token GraphQL path.)
const QUERY = `query {
  viewer {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

export interface Calendar {
  total: number;
  weeks: { days: { date: string; count: number; level: string }[] }[];
}

// A normal GraphQL response lands in about a second; 15s leaves ample room for a
// slow one while bounding a stalled connection, which would otherwise hold the
// build until the platform's own build timeout and never reach the seed fallback.
export const FETCH_TIMEOUT_MS = 15_000;

export interface FetchCalendarOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Returns the validated calendar, or null on ANY failure (caller falls back to the seed). */
export async function fetchCalendar(
  token: string,
  {
    fetchImpl = fetch,
    timeoutMs = FETCH_TIMEOUT_MS,
  }: FetchCalendarOptions = {},
): Promise<Calendar | null> {
  let json: unknown;
  try {
    // The signal also covers reading the body, so a response that starts and
    // then stalls is aborted too.
    const resp = await fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "korabeland.com-shift-log",
      },
      body: JSON.stringify({ query: QUERY }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      console.warn(
        `gen-shift-log: GitHub GraphQL returned HTTP ${resp.status}`,
      );
      return null;
    }
    json = await resp.json();
  } catch (err) {
    const timedOut = (err as Error).name === "TimeoutError";
    console.warn(
      timedOut
        ? `gen-shift-log: fetch timed out after ${timeoutMs}ms`
        : `gen-shift-log: fetch failed: ${(err as Error).message}`,
    );
    return null;
  }

  // Validate shape before accepting. contributionLevel returns enum STRINGS
  // (NONE..FOURTH_QUARTILE), not 0-4 numbers — validating against numbers would
  // reject every real response and permanently route production to the seed.
  const calendar = (json as GraphQLCalendarResponse)?.data?.viewer
    ?.contributionsCollection?.contributionCalendar;

  if (!calendar || !Array.isArray(calendar.weeks)) {
    console.warn("gen-shift-log: response missing contributionCalendar/weeks");
    return null;
  }
  if (calendar.weeks.length < 52) {
    console.warn(
      `gen-shift-log: only ${calendar.weeks.length} weeks (< 52); rejecting`,
    );
    return null;
  }

  const weeks: Calendar["weeks"] = [];
  for (const week of calendar.weeks) {
    if (!Array.isArray(week.contributionDays)) {
      console.warn("gen-shift-log: a week is missing contributionDays");
      return null;
    }
    const days = [];
    for (const day of week.contributionDays) {
      if (
        typeof day.date !== "string" ||
        typeof day.contributionCount !== "number" ||
        !CONTRIBUTION_LEVELS.includes(
          day.contributionLevel as (typeof CONTRIBUTION_LEVELS)[number],
        )
      ) {
        console.warn(
          `gen-shift-log: malformed day ${JSON.stringify(day)}; rejecting`,
        );
        return null;
      }
      days.push({
        date: day.date,
        count: day.contributionCount,
        level: day.contributionLevel,
      });
    }
    weeks.push({ days });
  }

  return { total: calendar.totalContributions, weeks };
}
