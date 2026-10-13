// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { startAnalytics } from "@/lib/analytics-client";
import {
  filterAnalyticsEvent,
  isLocalHost,
  sanitizeAnalyticsUrl,
  sanitizeReferrer,
} from "@/lib/analytics-privacy";

describe("sanitizeAnalyticsUrl", () => {
  it("strips query strings and fragments, keeping origin and path", () => {
    expect(
      sanitizeAnalyticsUrl(
        "https://korabeland.com/about?token=SECRET&x=1#frag",
      ),
    ).toBe("https://korabeland.com/about");
  });

  it("normalises a trailing slash but keeps the root", () => {
    expect(sanitizeAnalyticsUrl("https://korabeland.com/work/")).toBe(
      "https://korabeland.com/work",
    );
    expect(sanitizeAnalyticsUrl("https://korabeland.com/?shift=day")).toBe(
      "https://korabeland.com/",
    );
  });

  it.each([
    "/for/demo",
    "/for/",
    "/for",
    "/dev/skills-preview",
    "/keystatic/collection/posts",
    "/api/x",
  ])("drops the private path %s", (path) => {
    expect(
      sanitizeAnalyticsUrl(`https://korabeland.com${path}?a=b`),
    ).toBeNull();
  });

  it("does not treat lookalike public paths as private", () => {
    expect(sanitizeAnalyticsUrl("https://korabeland.com/format")).toBe(
      "https://korabeland.com/format",
    );
    expect(sanitizeAnalyticsUrl("https://korabeland.com/notes/for-real")).toBe(
      "https://korabeland.com/notes/for-real",
    );
  });

  it("drops unparseable and non-web URLs", () => {
    expect(sanitizeAnalyticsUrl("not a url")).toBeNull();
    expect(sanitizeAnalyticsUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("sanitizeReferrer", () => {
  const host = "korabeland.com";

  it("reduces a referrer to its origin", () => {
    expect(
      sanitizeReferrer(
        "https://www.linkedin.com/feed/update/abc?token=SECRET#x",
        host,
      ),
    ).toBe("https://www.linkedin.com/");
  });

  it.each([
    ["empty", ""],
    ["malformed", "::::"],
    ["a non-web scheme", "android-app://com.google.android.gm"],
    ["embedded credentials", "https://user:pass@example.com/path"],
    ["localhost", "http://localhost:3000/admin"],
    ["a private IP", "http://192.168.1.4/internal"],
    ["an internal name", "https://intranet/wiki"],
    ["this site itself", "https://korabeland.com/for/demo?x=1"],
  ])("drops %s", (_name, ref) => {
    expect(sanitizeReferrer(ref, host)).toBe("");
  });
});

describe("filterAnalyticsEvent", () => {
  it("returns the event with a clean url", () => {
    expect(
      filterAnalyticsEvent({
        type: "pageview",
        url: "https://korabeland.com/notes?q=SECRET",
      }),
    ).toEqual({ type: "pageview", url: "https://korabeland.com/notes" });
  });

  it("cancels events for private paths", () => {
    expect(
      filterAnalyticsEvent({
        type: "pageview",
        url: "https://korabeland.com/for/demo",
      }),
    ).toBeNull();
  });
});

describe("isLocalHost", () => {
  it.each([
    "localhost",
    "127.0.0.1",
    "[::1]".slice(1, -1),
    "foo.localhost",
  ])("%s is local", (h) => {
    expect(isLocalHost(h)).toBe(true);
  });
  it.each([
    "korabeland.com",
    "preview-abc.vercel.app",
  ])("%s is not local", (h) => {
    expect(isLocalHost(h)).toBe(false);
  });
});

describe("startAnalytics", () => {
  function env(referrer: string, hostname = "korabeland.com") {
    const document = { referrer } as Document;
    return {
      document,
      location: { host: hostname, hostname, pathname: "/about" } as Location,
      enabled: true,
    };
  }

  it("starts the collector once with the filter and a sanitised referrer", () => {
    const inject = vi.fn();
    const e = env("https://news.example.com/story?token=SECRET");
    expect(startAnalytics(inject, e)).toBe(true);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject.mock.calls[0][0].mode).toBe("production");
    expect(inject.mock.calls[0][0].beforeSend).toBe(filterAnalyticsEvent);
    expect(e.document.referrer).toBe("https://news.example.com/");
  });

  it("hides a same-site private referrer from the collector", () => {
    const e = env("https://korabeland.com/for/demo");
    startAnalytics(vi.fn(), e);
    expect(e.document.referrer).toBe("");
  });

  it("does not start on a developer machine", () => {
    const inject = vi.fn();
    expect(startAnalytics(inject, env("", "localhost"))).toBe(false);
    expect(inject).not.toHaveBeenCalled();
  });

  it("counts nothing if the referrer cannot be replaced", () => {
    const inject = vi.fn();
    const document = Object.freeze({
      referrer: "https://a.example.com/x?s=1",
    }) as Document;
    const result = startAnalytics(inject, {
      document,
      location: {
        host: "korabeland.com",
        hostname: "korabeland.com",
        pathname: "/about",
      } as Location,
      enabled: true,
    });
    expect(result).toBe(false);
    expect(inject).not.toHaveBeenCalled();
  });

  it.each([
    "/for/demo",
    "/dev/preview",
    "/keystatic/collection/posts",
    "/api/x",
  ])("does not load the collector for %s", (pathname) => {
    const inject = vi.fn();
    const e = env("");
    e.location.pathname = pathname;
    expect(startAnalytics(inject, e)).toBe(false);
    expect(inject).not.toHaveBeenCalled();
  });

  it("does not load the collector when the shared layout marks a page private", () => {
    const inject = vi.fn();
    const e = env("");
    e.enabled = false;
    expect(startAnalytics(inject, e)).toBe(false);
    expect(inject).not.toHaveBeenCalled();
  });
});
