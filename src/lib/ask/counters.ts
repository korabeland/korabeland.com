// Daily aggregate counters for the Ask panel. Pure apart from the injected
// fetch: tests pass a fake store. A counter is one number per event per day
// per environment; no session id, address, question text or timestamp finer
// than the UTC day is ever written.

export const COUNTER_EVENTS = [
  "open",
  "question",
  "answer",
  "fallback",
  "error",
] as const;
export type CounterEvent = (typeof COUNTER_EVENTS)[number];

/** Daily keys expire after this long, so the store cannot grow without bound. */
export const COUNTER_TTL_SECONDS = 400 * 24 * 60 * 60;
export const COUNTER_ENDPOINT = "/api/ask-count";
/** The request body is exactly {"event":"<name>"}; anything bigger is refused. */
export const MAX_BODY_BYTES = 64;

export type CounterEnvironment = "production" | "preview";

/** Only deployed environments count; local development writes nothing. */
export function counterEnvironment(
  vercelEnv: string | undefined,
): CounterEnvironment | null {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  return null;
}

export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** One hash per environment per UTC day, e.g. "ask:production:2026-10-14". */
export function counterKey(env: CounterEnvironment, day: string): string {
  return `ask:${env}:${day}`;
}

export function isCounterEvent(value: unknown): value is CounterEvent {
  return (
    typeof value === "string" &&
    (COUNTER_EVENTS as readonly string[]).includes(value)
  );
}

/** Strict body check: a JSON object whose only key is a known event. */
export function parseCounterBody(text: string): CounterEvent | null {
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "event") return null;
    const event = (body as { event: unknown }).event;
    return isCounterEvent(event) ? event : null;
  } catch {
    return null;
  }
}

export interface StoreConfig {
  url: string;
  token: string;
}

export type FetchLike = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Adds one to today's counter for `event`. Two store commands: HINCRBY, then
 * EXPIRE NX so the day's key gets its expiry once and keeps it. Throws on any
 * store failure; the caller decides that a failed count must not matter.
 */
export async function recordEvent(options: {
  event: CounterEvent;
  env: CounterEnvironment;
  now: Date;
  store: StoreConfig;
  fetch: FetchLike;
}): Promise<void> {
  const key = counterKey(options.env, utcDay(options.now));
  const response = await options.fetch(`${options.store.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.store.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["HINCRBY", key, options.event, 1],
      ["EXPIRE", key, COUNTER_TTL_SECONDS, "NX"],
    ]),
  });
  if (!response.ok)
    throw new Error(`counter store answered ${response.status}`);
  const results = (await response.json()) as { error?: string }[];
  const failed = Array.isArray(results) && results.find((r) => r?.error);
  if (failed) throw new Error("counter store rejected a command");
}

export type DailyCounts = Record<CounterEvent, number>;

export function emptyCounts(): DailyCounts {
  return { open: 0, question: 0, answer: 0, fallback: 0, error: 0 };
}

/** Reads one day's hash back (for the export script). */
export async function readDay(options: {
  env: CounterEnvironment;
  day: string;
  store: StoreConfig;
  fetch: FetchLike;
}): Promise<DailyCounts> {
  const response = await options.fetch(options.store.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.store.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["HGETALL", counterKey(options.env, options.day)]),
  });
  if (!response.ok)
    throw new Error(`counter store answered ${response.status}`);
  const { result } = (await response.json()) as { result?: unknown };
  const counts = emptyCounts();
  if (Array.isArray(result)) {
    for (let i = 0; i + 1 < result.length; i += 2) {
      const name = result[i];
      if (isCounterEvent(name)) counts[name] = Number(result[i + 1]) || 0;
    }
  }
  return counts;
}
