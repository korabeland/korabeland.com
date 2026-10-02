// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import seedJson from "@/content/shift-log/contributions.seed.json";
import { FETCH_TIMEOUT_MS, fetchCalendar } from "../scripts/shift-log-fetch";

// Drives the build-time GitHub fetch with an injected fetch, so every failure
// path is deterministic and offline. The script's contract: ANY failure yields
// null (the caller then copies the committed seed), and a stalled request must
// be cut off rather than hold the build.

type Day = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

function calendarResponse(weekCount: number, days: Day[] = []): Response {
  const weeks = Array.from({ length: weekCount }, () => ({
    contributionDays: days,
  }));
  return Response.json({
    data: {
      viewer: {
        contributionsCollection: {
          contributionCalendar: { totalContributions: 7, weeks },
        },
      },
    },
  });
}

// A fetch that never answers on its own and, like the real one, rejects when
// the caller's abort signal fires.
function stalledFetch(): typeof fetch {
  return ((_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(init.signal?.reason),
      );
    })) as typeof fetch;
}

describe("fetchCalendar", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives up on a stalled request once the timeout elapses", async () => {
    const started = Date.now();
    const result = await fetchCalendar("token", {
      fetchImpl: stalledFetch(),
      timeoutMs: 50,
    });
    expect(result).toBeNull();
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(console.warn).toHaveBeenCalledWith(
      "gen-shift-log: fetch timed out after 50ms",
    );
  });

  it("gives up when the response starts but the body stalls", async () => {
    const stalledBody = ((_url: unknown, init?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason),
            );
          }),
      })) as unknown as typeof fetch;
    await expect(
      fetchCalendar("token", { fetchImpl: stalledBody, timeoutMs: 20 }),
    ).resolves.toBeNull();
  });

  it("passes an abort signal to fetch", async () => {
    const fetchImpl = vi.fn(async () => calendarResponse(0));
    await fetchCalendar("token", { fetchImpl });
    const init = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("returns null on a network error", async () => {
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(fetchCalendar("token", { fetchImpl })).resolves.toBeNull();
  });

  it("returns null on a non-200 response", async () => {
    const fetchImpl = (async () =>
      new Response("nope", { status: 502 })) as typeof fetch;
    await expect(fetchCalendar("token", { fetchImpl })).resolves.toBeNull();
  });

  it("returns null when the response has too few weeks", async () => {
    const fetchImpl = (async () => calendarResponse(10)) as typeof fetch;
    await expect(fetchCalendar("token", { fetchImpl })).resolves.toBeNull();
  });

  it("returns the validated calendar unchanged on success", async () => {
    const days: Day[] = [
      {
        date: "2026-01-01",
        contributionCount: 3,
        contributionLevel: "SECOND_QUARTILE",
      },
      { date: "2026-01-02", contributionCount: 0, contributionLevel: "NONE" },
    ];
    const fetchImpl = (async () => calendarResponse(53, days)) as typeof fetch;
    const result = await fetchCalendar("token", { fetchImpl });
    expect(result?.total).toBe(7);
    expect(result?.weeks).toHaveLength(53);
    expect(result?.weeks[0].days).toEqual([
      { date: "2026-01-01", count: 3, level: "SECOND_QUARTILE" },
      { date: "2026-01-02", count: 0, level: "NONE" },
    ]);
  });

  it("keeps the default timeout well above a normal GitHub response", () => {
    expect(FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    expect(FETCH_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});

// The seed the failure path falls back to must itself be a valid calendar.
describe("seed fallback data", () => {
  it("has the 52+ weeks the live path demands", () => {
    expect(seedJson.weeks.length).toBeGreaterThanOrEqual(52);
  });
});
