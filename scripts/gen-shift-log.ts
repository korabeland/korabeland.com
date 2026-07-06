#!/usr/bin/env tsx
// Generates src/content/shift-log/contributions.json (the R9 shift-log grid data)
// from the GitHub GraphQL contribution calendar. Mirrors gen-trail-register's
// resilience contract: on ANY failure (missing token, non-200, shape mismatch)
// it copies the committed seed and exits 0, so a failed fetch never fails the
// build. Chained into `prebuild` only (NOT `predev`): Playwright's webServer
// runs `pnpm dev`, and a live fetch there would regenerate the JSON from real
// data on every test run, drifting colophon baselines daily. Dev and tests
// deliberately serve the committed seed via the loader's fallback.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "src/content/shift-log");
const outFile = resolve(outDir, "contributions.json");
const seedFile = resolve(outDir, "contributions.seed.json");

const LOGIN = process.env.GITHUB_CONTRIB_LOGIN ?? "korabeland";
const CONTRIBUTION_LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
] as const;

/**
 * tsx does NOT auto-load .env.local (only Astro/Vite does), so a local
 * with-token run needs a manual parse. Vercel's real process.env still wins.
 */
function resolveToken(): string | null {
  if (process.env.GITHUB_CONTRIB_TOKEN) return process.env.GITHUB_CONTRIB_TOKEN;
  const envLocal = resolve(repoRoot, ".env.local");
  if (!existsSync(envLocal)) return null;
  try {
    for (const line of readFileSync(envLocal, "utf8").split("\n")) {
      const match = line.match(/^\s*GITHUB_CONTRIB_TOKEN\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to null
  }
  return null;
}

interface RawDay {
  date: string;
  contributionCount: number;
  contributionLevel: string;
}

// The response is validated at runtime before use; this type makes the
// optional-chained navigation compile without asserting the data is present.
interface GraphQLCalendarResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: { contributionDays: RawDay[] }[];
        };
      };
    };
  };
}

const QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

async function fetchCalendar(token: string): Promise<{
  total: number;
  weeks: { days: { date: string; count: number; level: string }[] }[];
} | null> {
  let json: unknown;
  try {
    const resp = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "korabeland.com-shift-log",
      },
      body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
    });
    if (!resp.ok) {
      console.warn(
        `gen-shift-log: GitHub GraphQL returned HTTP ${resp.status}`,
      );
      return null;
    }
    json = await resp.json();
  } catch (err) {
    console.warn(`gen-shift-log: fetch failed: ${(err as Error).message}`);
    return null;
  }

  // Validate shape before accepting. contributionLevel returns enum STRINGS
  // (NONE..FOURTH_QUARTILE), not 0-4 numbers — validating against numbers would
  // reject every real response and permanently route production to the seed.
  const calendar = (json as GraphQLCalendarResponse)?.data?.user
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

  const weeks: { days: { date: string; count: number; level: string }[] }[] =
    [];
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

function fallbackToSeed(): void {
  if (!existsSync(seedFile)) {
    throw new Error(
      `gen-shift-log: fetch unavailable and no seed at ${seedFile}`,
    );
  }
  copyFileSync(seedFile, outFile);
  console.warn(`gen-shift-log: SEED FALLBACK — copied seed → ${outFile}`);
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  const token = resolveToken();
  if (!token) {
    console.warn(
      "gen-shift-log: no GITHUB_CONTRIB_TOKEN (env or .env.local); using seed",
    );
    fallbackToSeed();
    return;
  }

  const calendar = await fetchCalendar(token);
  if (!calendar) {
    fallbackToSeed();
    return;
  }

  const payload = {
    fetchedAt: new Date().toISOString().slice(0, 10),
    source: "api" as const,
    total: calendar.total,
    weeks: calendar.weeks,
  };
  writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `gen-shift-log: LIVE — wrote ${calendar.total} contributions, ${calendar.weeks.length} weeks → ${outFile}`,
  );
}

main().catch((err) => {
  // Last-resort guard: even an unexpected throw must not fail the build if a
  // seed exists. Only a genuinely missing seed is fatal.
  console.warn(`gen-shift-log: unexpected error: ${(err as Error).message}`);
  try {
    fallbackToSeed();
  } catch (seedErr) {
    console.error((seedErr as Error).message);
    process.exit(1);
  }
});
