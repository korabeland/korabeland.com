#!/usr/bin/env tsx
// Prints the Ask panel's daily counters as CSV: date, opens, questions,
// answers, fallbacks, errors. Reads the shared counter store with the
// KV_REST_API_URL and KV_REST_API_TOKEN variables, which exist only in
// Vercel's Production and Preview environments. To run it locally, pull them
// into your shell without printing them, for example:
//   vercel env pull /tmp/ask.env --environment=production && set -a && . /tmp/ask.env && set +a
// Usage:
//   pnpm export:ask-counts                     # last 30 days, production
//   pnpm export:ask-counts --env preview --days 7

import {
  COUNTER_EVENTS,
  type CounterEnvironment,
  type FetchLike,
  readDay,
  utcDay,
} from "../src/lib/ask/counters";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}

async function main(): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("KV_REST_API_URL and KV_REST_API_TOKEN are not set");
  }
  const env = arg("env", "production") as CounterEnvironment;
  if (env !== "production" && env !== "preview") {
    throw new Error("--env must be production or preview");
  }
  const days = Number(arg("days", "30"));
  if (!Number.isInteger(days) || days < 1 || days > 400) {
    throw new Error("--days needs a whole number from 1 to 400");
  }
  const store = { url: url.replace(/\/$/, ""), token };
  const fetcher: FetchLike = (input, init) => fetch(input, init);
  console.log(["date", ...COUNTER_EVENTS].join(","));
  const today = new Date();
  for (let back = days - 1; back >= 0; back--) {
    const day = utcDay(new Date(today.getTime() - back * 86_400_000));
    const counts = await readDay({ env, day, store, fetch: fetcher });
    console.log([day, ...COUNTER_EVENTS.map((e) => counts[e])].join(","));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
