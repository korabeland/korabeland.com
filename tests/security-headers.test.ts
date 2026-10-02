// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../astro.config.mjs";
import { themeScriptHash } from "../scripts/theme-script-hash";
import {
  assertHardenedCsp,
  uncoveredInlineScripts,
  withNotFoundCsp,
} from "../scripts/vercel-csp";

const ROOT = process.cwd();
const BASELINE =
  "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self' 'sha256-abc'; style-src 'self'";

function vercelConfig(overrides: Record<string, unknown> = {}) {
  return {
    version: 3,
    routes: [
      { src: "/404", headers: { "content-security-policy": BASELINE } },
      { handle: "filesystem" },
      { src: "^/.*$", dest: "/404.html", status: 404 },
    ],
    ...overrides,
  };
}

describe("response headers (vercel.json)", () => {
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8"));
  const rule = vercel.headers.find(
    (h: { source: string }) => h.source === "/(.*)",
  );
  const value = (key: string): string =>
    rule.headers.find((h: { key: string }) => h.key === key)?.value;

  it("applies to every path", () => {
    expect(rule).toBeDefined();
  });

  it("stops MIME sniffing and framing", () => {
    expect(value("X-Content-Type-Options")).toBe("nosniff");
    expect(value("X-Frame-Options")).toBe("DENY");
  });

  it("sets an explicit referrer policy", () => {
    expect(value("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("switches off browser features the site never uses", () => {
    const policy = value("Permissions-Policy");
    const allowlists = new Map(
      policy.split(",").map((directive) => {
        const pair = /^([a-z][a-z0-9-]*)\s*=\s*\(([^)]*)\)$/.exec(
          directive.trim(),
        );
        if (!pair) throw new Error(`Invalid Permissions-Policy: ${directive}`);
        return [pair[1], pair[2].trim().split(/\s+/).filter(Boolean)] as const;
      }),
    );
    for (const feature of [
      "accelerometer",
      "bluetooth",
      "browsing-topics",
      "camera",
      "display-capture",
      "geolocation",
      "gyroscope",
      "hid",
      "magnetometer",
      "microphone",
      "midi",
      "payment",
      "serial",
      "usb",
    ]) {
      expect(allowlists.get(feature)).toEqual([]);
    }
  });
});

describe("www redirect (vercel.json)", () => {
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf8"));
  const { getTransformedRoutes } = createRequire(
    import.meta.resolve("@astrojs/vercel"),
  )("@vercel/routing-utils");

  it.each([
    { name: "project config", redirects: vercel.redirects },
    {
      name: "equivalent named wildcard",
      redirects: vercel.redirects.map((rule: Record<string, unknown>) => ({
        ...rule,
        source: "/:path(.*)",
        destination: "https://korabeland.com/:path",
      })),
    },
  ])("preserves permanent redirect behavior for $name", ({ redirects }) => {
    const normalized = getTransformedRoutes({ redirects });
    expect(normalized.error).toBeNull();
    const routes = normalized.routes as {
      src: string;
      has?: { type: string; value: string }[];
      status: number;
      headers: { Location: string };
    }[];
    const redirect = (request: string) => {
      const url = new URL(request);
      for (const route of routes) {
        const matchesHost = (route.has ?? []).every((condition) => {
          expect(condition.type).toBe("host");
          return url.hostname === condition.value;
        });
        const match = new RegExp(route.src).exec(url.pathname);
        if (!matchesHost || !match) continue;
        const location = new URL(
          route.headers.Location.replace(
            /\$(\d+)/g,
            (_, index: string) => match[Number(index)] ?? "",
          ),
        );
        expect(location.search).toBe("");
        location.search = url.search;
        return { status: route.status, location: location.href };
      }
      return undefined;
    };

    for (const path of [
      "/",
      "/?ref=home",
      "/notes/a-b",
      "/notes/a-b/?tag=one&tag=two&next=%2Fwork%2F",
      "/work/nested/project",
      "/notes/caf%C3%A9",
    ]) {
      expect(redirect(`https://www.korabeland.com${path}`)).toEqual({
        status: 308,
        location: `https://korabeland.com${path}`,
      });
      for (const host of ["korabeland.com", "preview.korabeland.com"]) {
        expect(redirect(`https://${host}${path}`)).toBeUndefined();
      }
    }
  });
});

describe("Content-Security-Policy source config (astro.config.mjs)", () => {
  const csp = config.security?.csp as {
    directives: string[];
    scriptDirective?: { hashes: string[]; resources?: string[] };
    styleDirective: { resources: unknown[] };
  };

  it("pins the same-origin baseline and forbids framing", () => {
    expect(csp.directives).toEqual(
      expect.arrayContaining([
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ]),
    );
  });

  it("never loosens script-src: hashes only, no 'unsafe-*'", () => {
    const layout = readFileSync(
      resolve(ROOT, "src/layouts/BaseLayout.astro"),
      "utf8",
    );
    expect(csp.scriptDirective).toEqual({ hashes: [themeScriptHash(layout)] });
    expect(csp.directives.some((d) => d.startsWith("script-src"))).toBe(false);
  });

  it("allows 'unsafe-inline' only for style attributes", () => {
    expect(csp.styleDirective.resources).toEqual([
      "'self'",
      { resource: "'unsafe-inline'", kind: "attribute" },
    ]);
  });

  it("registers the emitted CSP validation as the postbuild command", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts.postbuild).toBe("tsx scripts/patch-vercel-config.ts");
  });
});

describe("withNotFoundCsp", () => {
  it("copies the /404 policy onto the catch-all 404 route", () => {
    const out = withNotFoundCsp(vercelConfig());
    const catchAll = out.routes?.find((r) => r.dest === "/404.html");
    expect(catchAll?.headers?.["content-security-policy"]).toBe(BASELINE);
  });

  it("leaves every other route untouched", () => {
    const input = vercelConfig();
    const out = withNotFoundCsp(input);
    expect(out.routes?.[0]).toEqual(input.routes[0]);
    expect(out.routes?.[1]).toEqual(input.routes[1]);
  });

  it("fails when the /404 route has no policy", () => {
    const input = vercelConfig({
      routes: [
        { src: "/404" },
        { src: "^/.*$", dest: "/404.html", status: 404 },
      ],
    });
    expect(() => withNotFoundCsp(input)).toThrow(/staticHeaders/);
  });

  it("fails when there is no catch-all 404 route", () => {
    const input = vercelConfig({
      routes: [
        { src: "/404", headers: { "content-security-policy": BASELINE } },
      ],
    });
    expect(() => withNotFoundCsp(input)).toThrow(/catch-all/);
  });
});

describe("assertHardenedCsp", () => {
  const withPolicy = (policy: string) =>
    vercelConfig({
      routes: [{ src: "/x", headers: { "content-security-policy": policy } }],
    });

  it("accepts the baseline policy", () => {
    expect(assertHardenedCsp(withPolicy(BASELINE))).toBe(1);
  });

  it("rejects a policy that drops frame-ancestors", () => {
    const weak = BASELINE.replace("frame-ancestors 'none'; ", "");
    expect(() => assertHardenedCsp(withPolicy(weak))).toThrow(
      /frame-ancestors/,
    );
  });

  it("rejects unsafe-inline scripts", () => {
    const weak = BASELINE.replace("'sha256-abc'", "'unsafe-inline'");
    expect(() => assertHardenedCsp(withPolicy(weak))).toThrow(/hash/);
  });

  it("rejects a config with no CSP at all", () => {
    expect(() => assertHardenedCsp({ routes: [{ src: "/x" }] })).toThrow(
      /no route/,
    );
  });
});

describe("themeScriptHash", () => {
  it("hashes exactly the script between the SHIFT-RESOLVE markers", () => {
    const layout =
      "<!-- SHIFT-RESOLVE:START --><script is:inline>var a=1;</script><!-- SHIFT-RESOLVE:END -->";
    expect(themeScriptHash(layout)).toBe(
      `sha256-${createHash("sha256").update("var a=1;").digest("base64")}`,
    );
  });

  it("throws if the marked block disappears", () => {
    expect(() => themeScriptHash("<script is:inline>x</script>")).toThrow(
      /SHIFT-RESOLVE/,
    );
  });
});

describe("uncoveredInlineScripts", () => {
  const hashOf = (body: string) =>
    `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
  const policy = (...sources: string[]) =>
    `default-src 'self'; script-src 'self' ${sources.join(" ")}; style-src 'self'`;

  it("passes when every inline script is hashed", () => {
    const html = '<script>var a=1;</script><script type="module">b()</script>';
    expect(
      uncoveredInlineScripts(html, policy(hashOf("var a=1;"), hashOf("b()"))),
    ).toEqual([]);
  });

  it("reports an inline script missing from the policy", () => {
    expect(
      uncoveredInlineScripts("<script>var a=1;</script>", policy()),
    ).toEqual([hashOf("var a=1;")]);
  });

  it("ignores external scripts, JSON-LD data blocks and commented-out tags", () => {
    const html =
      '<!-- the <script> tag --><script src="/a.js"></script><script type="application/ld+json">{}</script>';
    expect(uncoveredInlineScripts(html, policy())).toEqual([]);
  });
});
