import { readFileSync } from "node:fs";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { themeScriptHash } from "./scripts/theme-script-hash";

const themeScript = themeScriptHash(
  readFileSync(
    new URL("./src/layouts/BaseLayout.astro", import.meta.url),
    "utf8",
  ),
);

// Vite's dev server injects page styles as unhashed <style> elements at runtime,
// which a hash-only style-src blocks (the dev pages render unstyled). The CSP
// is a production-build concern, so it is off under `astro dev`.
const isDev = process.argv.includes("dev");

export default defineConfig({
  site: "https://korabeland.com",
  // Preserve separator spaces around inline links across template newlines.
  compressHTML: true,
  // Static-by-default: every route prerenders unless it opts out with
  // `export const prerender = false`. Only /off-trail (reads ?from) and the four
  // dev/* routes are SSR; the 404 page is prerendered and the redirects below
  // are emitted as hosting rules, not rendered per request. This makes forgetting an export fail safe (a static
  // page) instead of silently turning a route into a per-request lambda.
  output: "static",
  // imageService: true swaps Astro's bundled Sharp (libvips ~17 MB, the bulk of
  // the server function) for Vercel's native image optimizer, slimming the
  // lambda to little more than the SSR routes it still needs to serve.
  // staticHeaders makes the adapter emit each prerendered page's CSP as a real
  // response header in .vercel/output/config.json (SSR routes get theirs at
  // runtime). The remaining headers live in vercel.json.
  adapter: vercel({ imageService: true, staticHeaders: true }),
  // Content-Security-Policy. Astro hashes every inline <script> and <style> it
  // renders (the pre-paint theme script, inlined page CSS, bundled islands), so
  // script-src never needs 'unsafe-inline'. The CSP lands as a header, which is
  // also the only place frame-ancestors is honoured (a <meta> CSP ignores it).
  security: {
    csp: isDev
      ? false
      : {
          directives: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            // Fonts under Vite's inline limit ship as data: URIs inside the
            // inlined page CSS.
            "font-src 'self' data:",
          ],
          // The no-flash theme script is is:inline, which Astro does not hash.
          scriptDirective: { hashes: [themeScript] },
          // Inline style="" attributes (CSS custom properties on the ledger, shift
          // log and portrait) can't be hashed, so style attributes alone allow
          // 'unsafe-inline'. Style elements stay hash-only. Overriding resources
          // drops Astro's default 'self', so restate it.
          styleDirective: {
            resources: [
              "'self'",
              { resource: "'unsafe-inline'", kind: "attribute" },
            ],
          },
        },
  },
  // Inline all page CSS instead of linking external stylesheets: the mobile
  // Lighthouse audit measured ~750ms of render-blocking CSS on the critical
  // path (BaseLayout.css + page CSS) before first paint. Inlining trades a
  // slightly larger HTML payload for zero extra round trips.
  build: { inlineStylesheets: "always" },
  // Dev/preview port. Honour the PORT env var so Claude Code's launch.json
  // `autoPort` — which communicates its chosen free port ONLY via PORT — makes
  // `astro dev` actually bind that port. Astro ignores PORT on its own and would
  // otherwise collide on 4321 between concurrent worktrees. The Playwright suite
  // passes `--port` explicitly (a CLI flag overrides this); a bare `pnpm dev`
  // with no PORT still defaults to 4321. See the DEV_PORT contract (Finding 2).
  server: { port: Number(process.env.PORT) || 4321 },
  trailingSlash: "never",
  // The Playwright webServer sets TEST_CAPTURE=1 so the dev toolbar can't be
  // captured into a screenshot baseline. Plain `pnpm dev` keeps the toolbar.
  devToolbar: { enabled: !process.env.TEST_CAPTURE },
  // /projects moved to /work in the console redesign (2026-07-03).
  // The two side projects moved to /lab in the work/lab split (2026-07-11);
  // their old /work URLs were live and indexed, so they redirect permanently.
  redirects: {
    "/projects": "/work",
    "/projects/[slug]": "/work/[slug]",
    "/work/perian": "/lab/perian",
    "/work/personal-os": "/lab/personal-os",
  },
  integrations: [
    react(),
    mdx(),
    // Keystatic admin is dev-only — excluded from production builds so
    // /keystatic routes don't exist in deployed output. Content files are
    // committed to git and readable by Astro's content API in all envs.
    ...(process.env.NODE_ENV !== "production" ? [keystatic()] : []),
    sitemap({
      // Exclude dev-only previews and the unlisted tailored pages. /for/ pages
      // are noindex, not robots-disallowed, so crawlers can still see the
      // noindex directive — the sitemap just never advertises them. /off-trail
      // is the same case: it sends noindex, so it stays out of the sitemap too.
      filter: (page) =>
        !page.includes("/dev/") &&
        !page.includes("/for/") &&
        !page.includes("/off-trail"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
