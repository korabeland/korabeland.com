import { createHash } from "node:crypto";

// Pure helpers for scripts/patch-vercel-config.ts. The Vercel adapter attaches
// each prerendered page's Content-Security-Policy to a route that matches that
// page's own path (`/about`, `/work`, …). Unknown URLs never match one: they
// fall through to the catch-all route that serves 404.html, so the 404 response
// went out without a CSP. Copy the `/404` route's policy onto that catch-all.

interface VercelRoute {
  src?: string;
  dest?: string;
  status?: number;
  headers?: Record<string, string>;
  handle?: string;
  [key: string]: unknown;
}

interface VercelConfig {
  routes?: VercelRoute[];
  [key: string]: unknown;
}

const CSP_HEADER = "content-security-policy";

export function withNotFoundCsp(config: VercelConfig): VercelConfig {
  const routes = config.routes ?? [];
  const policy = routes.find((r) => r.src === "/404")?.headers?.[CSP_HEADER];
  if (!policy) {
    throw new Error("no CSP header on the /404 route; is staticHeaders on?");
  }
  const catchAll = routes.find(
    (r) => r.dest === "/404.html" && r.status === 404,
  );
  if (!catchAll) {
    throw new Error(
      "no catch-all route serving /404.html in the Vercel config",
    );
  }
  return {
    ...config,
    routes: routes.map((r) =>
      r === catchAll
        ? { ...r, headers: { ...r.headers, [CSP_HEADER]: policy } }
        : r,
    ),
  };
}

// Every CSP the build emits must keep the baseline that the policy exists for:
// same-origin defaults, no plugins, no framing, and scripts gated by hash (never
// 'unsafe-inline' / 'unsafe-eval'). Throws on the first violation so a config
// change that quietly weakens the policy fails the build.
const REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

export function assertHardenedCsp(config: VercelConfig): number {
  let checked = 0;
  for (const route of config.routes ?? []) {
    const policy = route.headers?.[CSP_HEADER];
    if (!policy) continue;
    const where = route.src ?? "(unnamed route)";
    const directives = policy.split(";").map((d) => d.trim());
    for (const required of REQUIRED_DIRECTIVES) {
      if (!directives.includes(required)) {
        throw new Error(`CSP on ${where} is missing \`${required}\``);
      }
    }
    const scripts = directives.find((d) => d.startsWith("script-src"));
    if (!scripts || /'unsafe-(inline|eval)'/.test(scripts)) {
      throw new Error(
        `CSP on ${where} must gate scripts by hash, not unsafe-*`,
      );
    }
    checked += 1;
  }
  if (checked === 0)
    throw new Error("no route in the Vercel config carries a CSP");
  return checked;
}

// A script the browser would execute under CSP: inline (no src) and not a data
// block such as application/ld+json.
function inlineScriptBodies(html: string): string[] {
  const bodies: string[] = [];
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of withoutComments.matchAll(
    /<script([^>]*)>([\s\S]*?)<\/script>/g,
  )) {
    const attrs = m[1];
    if (/\ssrc=/.test(attrs)) continue;
    const type = attrs.match(/\stype=["']?([^"'\s>]+)/)?.[1];
    if (type && type !== "module" && !/javascript/.test(type)) continue;
    bodies.push(m[2]);
  }
  return bodies;
}

// Every inline script a prerendered page runs must be allowed by that page's
// own CSP, or the browser blocks it and the page quietly breaks (the no-flash
// theme script being the one that matters most). Returns the unmatched hashes.
export function uncoveredInlineScripts(html: string, policy: string): string[] {
  const scriptSrc = policy
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith("script-src "));
  const missing: string[] = [];
  for (const body of inlineScriptBodies(html)) {
    const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
    if (!scriptSrc?.split(/\s+/).includes(hash)) missing.push(hash);
  }
  return missing;
}
