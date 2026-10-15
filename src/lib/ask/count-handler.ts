// The request side of the counter endpoint (src/pages/api/ask-count.ts), kept
// apart from the route so Vitest can drive it with plain Request objects and a
// fake store. It reads no address, cookie or header beyond what it needs to
// judge the request, writes one number, and logs nothing from the request.

import {
  type CounterEnvironment,
  counterEnvironment,
  type FetchLike,
  MAX_BODY_BYTES,
  parseCounterBody,
  recordEvent,
  type StoreConfig,
} from "./counters";

/** Per-instance ceiling on store writes per minute. Ordinary traffic is far
 *  below it; a flood is cut off here before it reaches the store's quota. */
export const WRITES_PER_MINUTE = 30;

export interface Throttle {
  take(now: number): boolean;
}

export function createThrottle(limit = WRITES_PER_MINUTE): Throttle {
  let windowStart = 0;
  let used = 0;
  return {
    take(now) {
      if (now - windowStart >= 60_000) {
        windowStart = now;
        used = 0;
      }
      if (used >= limit) return false;
      used += 1;
      return true;
    },
  };
}

export interface HandlerDeps {
  vercelEnv: string | undefined;
  store: StoreConfig | null;
  fetch: FetchLike;
  throttle: Throttle;
  now: () => Date;
  /** Receives a fixed message only, never request content. */
  log?: (message: string) => void;
}

const HEADERS = { "Cache-Control": "no-store" };

function reply(status: number): Response {
  return new Response(null, { status, headers: HEADERS });
}

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** The body as text, or null if it is larger than MAX_BODY_BYTES. Stops
 *  reading at the cap, so a request without a length header cannot make the
 *  server buffer a large body. */
async function readBounded(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 204 for a counted or deliberately ignored event, 4xx for a request that
 * is not ours. A store failure is still 204: the browser never needs to know,
 * and search never waits on it.
 */
export async function handleCountRequest(
  request: Request,
  deps: HandlerDeps,
): Promise<Response> {
  if (request.method !== "POST") return reply(405);
  if (!sameOrigin(request)) return reply(403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply(415);
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return reply(413);
  const text = await readBounded(request);
  if (text === null) return reply(413);
  const event = parseCounterBody(text);
  if (!event) return reply(400);

  const env: CounterEnvironment | null = counterEnvironment(deps.vercelEnv);
  if (!env || !deps.store) return reply(204);
  const now = deps.now();
  if (!deps.throttle.take(now.getTime())) return reply(204);
  try {
    await recordEvent({
      event,
      env,
      now,
      store: deps.store,
      fetch: deps.fetch,
    });
  } catch {
    deps.log?.("ask-count: store write failed");
  }
  return reply(204);
}
