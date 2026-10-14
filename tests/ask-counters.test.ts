// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createThrottle, handleCountRequest } from "@/lib/ask/count-handler";
import {
  COUNTER_EVENTS,
  COUNTER_TTL_SECONDS,
  counterEnvironment,
  counterKey,
  emptyCounts,
  type FetchLike,
  parseCounterBody,
  readDay,
  recordEvent,
  utcDay,
} from "@/lib/ask/counters";
import {
  countOpenOnce,
  OPEN_COUNTED_KEY,
  sendEvent,
} from "@/lib/ask/telemetry-client";

const NOW = new Date("2026-10-14T23:59:30.000Z");
const STORE = { url: "https://example.upstash.io", token: "secret-token" };

const okStore = (): FetchLike & { calls: unknown[][] } => {
  const calls: unknown[][] = [];
  const f = vi.fn(async (...args: unknown[]) => {
    calls.push(args);
    return {
      ok: true,
      status: 200,
      json: async () => [{ result: 1 }, { result: 1 }],
    };
  }) as unknown as FetchLike & { calls: unknown[][] };
  f.calls = calls;
  return f;
};

describe("counter keys", () => {
  it("separates preview from production and one UTC day from the next", () => {
    expect(counterKey("production", utcDay(NOW))).toBe(
      "ask:production:2026-10-14",
    );
    expect(counterKey("preview", utcDay(NOW))).toBe("ask:preview:2026-10-14");
    expect(utcDay(new Date("2026-10-15T00:00:00.000Z"))).toBe("2026-10-15");
  });
  it("counts only deployed environments", () => {
    expect(counterEnvironment("production")).toBe("production");
    expect(counterEnvironment("preview")).toBe("preview");
    expect(counterEnvironment("development")).toBeNull();
    expect(counterEnvironment(undefined)).toBeNull();
  });
});

describe("parseCounterBody", () => {
  it("accepts exactly one known event", () => {
    for (const e of COUNTER_EVENTS) {
      expect(parseCounterBody(JSON.stringify({ event: e }))).toBe(e);
    }
  });
  it.each([
    "",
    "nope",
    "[]",
    '{"event":"hack"}',
    '{"event":"open","q":"what is your salary"}',
    '{"q":"x"}',
    `{"event":"open","pad":"${"x".repeat(100)}"}`,
  ])("rejects %s", (body) => {
    expect(parseCounterBody(body)).toBeNull();
  });
});

describe("recordEvent", () => {
  it("adds one to today's hash and sets the expiry once, in a single request", async () => {
    const fetch = okStore();
    await recordEvent({
      event: "answer",
      env: "preview",
      now: NOW,
      store: STORE,
      fetch,
    });
    expect(fetch.calls).toHaveLength(1);
    const [url, init] = fetch.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ];
    expect(url).toBe("https://example.upstash.io/pipeline");
    expect(init.headers.Authorization).toBe("Bearer secret-token");
    expect(JSON.parse(init.body)).toEqual([
      ["HINCRBY", "ask:preview:2026-10-14", "answer", 1],
      ["EXPIRE", "ask:preview:2026-10-14", COUNTER_TTL_SECONDS, "NX"],
    ]);
  });
  it("throws when the store refuses", async () => {
    const fetch: FetchLike = async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    });
    await expect(
      recordEvent({
        event: "open",
        env: "production",
        now: NOW,
        store: STORE,
        fetch,
      }),
    ).rejects.toThrow();
  });
  it("throws when a command inside the pipeline fails", async () => {
    const fetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => [{ error: "ERR" }, { result: 0 }],
    });
    await expect(
      recordEvent({
        event: "open",
        env: "production",
        now: NOW,
        store: STORE,
        fetch,
      }),
    ).rejects.toThrow();
  });
});

describe("readDay", () => {
  it("reads a day's hash into named counts", async () => {
    const fetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: ["open", "3", "answer", "2", "junk", "9"] }),
    });
    expect(
      await readDay({
        env: "production",
        day: "2026-10-14",
        store: STORE,
        fetch,
      }),
    ).toEqual({
      ...emptyCounts(),
      open: 3,
      answer: 2,
    });
  });
});

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://korabeland.com/api/ask-count", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function deps(over: Partial<Parameters<typeof handleCountRequest>[1]> = {}) {
  const fetch = okStore();
  return {
    fetch,
    d: {
      vercelEnv: "production",
      store: STORE,
      fetch,
      throttle: createThrottle(),
      now: () => NOW,
      ...over,
    },
  };
}

describe("handleCountRequest", () => {
  it("counts a valid same-origin event and answers 204 with no body", async () => {
    const { fetch, d } = deps();
    const res = await handleCountRequest(post({ event: "open" }), d);
    expect(res.status).toBe(204);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetch.calls).toHaveLength(1);
  });

  it("answers 204 and keeps working when the store is down", async () => {
    const log = vi.fn();
    const failing: FetchLike = async () => {
      throw new Error("network");
    };
    const { d } = deps({ fetch: failing, log });
    const res = await handleCountRequest(post({ event: "question" }), d);
    expect(res.status).toBe(204);
    expect(log).toHaveBeenCalledWith("ask-count: store write failed");
  });

  it("never logs request content", async () => {
    const log = vi.fn();
    const failing: FetchLike = async () => {
      throw new Error("network");
    };
    const { d } = deps({ fetch: failing, log });
    await handleCountRequest(post({ event: "open" }), d);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/open|secret-token/);
  });

  it("writes nothing outside Vercel's production and preview", async () => {
    const { fetch, d } = deps({ vercelEnv: undefined });
    expect((await handleCountRequest(post({ event: "open" }), d)).status).toBe(
      204,
    );
    expect(fetch.calls).toHaveLength(0);
  });

  it("writes nothing when the store is not configured", async () => {
    const { fetch, d } = deps({ store: null });
    expect((await handleCountRequest(post({ event: "open" }), d)).status).toBe(
      204,
    );
    expect(fetch.calls).toHaveLength(0);
  });

  it("rejects other methods, other sites, other content types and bad bodies", async () => {
    const { fetch, d } = deps();
    const get = new Request("https://korabeland.com/api/ask-count");
    expect((await handleCountRequest(get, d)).status).toBe(405);
    expect(
      (
        await handleCountRequest(
          post({ event: "open" }, { "sec-fetch-site": "cross-site" }),
          d,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleCountRequest(
          post({ event: "open" }, { "content-type": "text/plain" }),
          d,
        )
      ).status,
    ).toBe(415);
    expect((await handleCountRequest(post({ event: "nope" }), d)).status).toBe(
      400,
    );
    expect(
      (await handleCountRequest(post({ event: "open", q: "hi" }), d)).status,
    ).toBe(400);
    expect(fetch.calls).toHaveLength(0);
  });

  it("falls back to the Origin header when Sec-Fetch-Site is absent", async () => {
    const { d } = deps();
    const base = { "content-type": "application/json" };
    const ok = new Request("https://korabeland.com/api/ask-count", {
      method: "POST",
      headers: { ...base, origin: "https://korabeland.com" },
      body: '{"event":"open"}',
    });
    const bad = new Request("https://korabeland.com/api/ask-count", {
      method: "POST",
      headers: { ...base, origin: "https://evil.example" },
      body: '{"event":"open"}',
    });
    expect((await handleCountRequest(ok, d)).status).toBe(204);
    expect((await handleCountRequest(bad, d)).status).toBe(403);
  });

  it("stops writing to the store after the per-minute ceiling", async () => {
    const { fetch, d } = deps({ throttle: createThrottle(3) });
    for (let i = 0; i < 10; i++) {
      expect(
        (await handleCountRequest(post({ event: "open" }), d)).status,
      ).toBe(204);
    }
    expect(fetch.calls).toHaveLength(3);
  });
});

describe("telemetry client", () => {
  it("sends only the event name", () => {
    const send = vi.fn(async () => ({}));
    sendEvent("question", send);
    expect(send).toHaveBeenCalledWith("/api/ask-count", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"event":"question"}',
      keepalive: true,
    });
  });
  it("never throws, whether send rejects or throws", () => {
    expect(() =>
      sendEvent("open", async () => Promise.reject(new Error("x"))),
    ).not.toThrow();
    expect(() =>
      sendEvent("open", () => {
        throw new Error("x");
      }),
    ).not.toThrow();
  });
  it("counts an open once per session and stores no identifier", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const send = vi.fn(async () => ({}));
    countOpenOnce(storage, send);
    countOpenOnce(storage, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(data.get(OPEN_COUNTED_KEY)).toBe("1");
  });
});
