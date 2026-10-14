#!/usr/bin/env tsx
// Prints monthly pageview totals for korabeland.com as CSV.
//
// Why: the Hobby plan of Vercel Web Analytics keeps one month of data, so run
// this once a month and file the output. It asks Vercel's API through the
// `vercel` CLI, which uses the login you already have; no token is stored in
// the repository. Usage:
//   pnpm export:pageviews            # this month and the previous one
//   pnpm --silent export:pageviews > pageviews-2026-10.csv

import { execFileSync } from "node:child_process";
import {
  formatCsv,
  monthStart,
  parseMonthRows,
} from "../src/lib/pageview-export";

// Identifiers, not secrets: the Vercel project and team for korabeland.com.
const PROJECT_ID = "prj_CLexAjSgpXWgay2rLgj4EZfC21FV";
const TEAM_ID = "team_wcPSN7DA6vMbz5WiDFFw9qIX";

function main(): void {
  const now = new Date();
  const params = new URLSearchParams({
    projectId: PROJECT_ID,
    teamId: TEAM_ID,
    since: monthStart(now),
    until: now.toISOString(),
    by: "month",
  });
  const out = execFileSync(
    "vercel",
    [
      "api",
      `/v1/query/web-analytics/visits/aggregate?${params}`,
      "-X",
      "GET",
      "--raw",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  process.stdout.write(formatCsv(parseMonthRows(JSON.parse(out))));
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
