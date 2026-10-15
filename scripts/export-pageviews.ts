#!/usr/bin/env tsx
// Prints monthly pageview totals for korabeland.com as CSV.
//
// Why: the Hobby plan of Vercel Web Analytics keeps a rolling month of data, so
// run this during the first UTC hour of each month (00:00 to 00:59) and file
// the completed month. Later runs are refused: the earliest hours of the prior
// month would already be gone and the total would be partial. It
// asks Vercel's API through the `vercel` CLI, which uses your login; no token
// is stored in the repository. Usage:
//   pnpm export:pageviews            # previous completed month, 00:00-00:59 UTC on day 1
//   pnpm --silent export:pageviews > pageviews-2026-10.csv

import { execFileSync } from "node:child_process";
import {
  completedMonthRange,
  formatCsv,
  parseMonthRows,
} from "../src/lib/pageview-export";

// Identifiers, not secrets: the Vercel project and team for korabeland.com.
const PROJECT_ID = "prj_CLexAjSgpXWgay2rLgj4EZfC21FV";
const TEAM_ID = "team_wcPSN7DA6vMbz5WiDFFw9qIX";

function main(): void {
  const range = completedMonthRange(new Date());
  const params = new URLSearchParams({
    projectId: PROJECT_ID,
    teamId: TEAM_ID,
    since: range.since,
    until: range.until,
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
