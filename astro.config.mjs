import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://korabeland.com",
  // Static-by-default: every route prerenders unless it opts out with
  // `export const prerender = false`. Only /off-trail (reads ?from) and the two
  // dev/* previews are SSR. This makes forgetting an export fail safe (a static
  // page) instead of silently turning a route into a per-request lambda.
  output: "static",
  // imageService: true swaps Astro's bundled Sharp (libvips ~17 MB, the bulk of
  // the server function) for Vercel's native image optimizer, slimming the
  // lambda to little more than the SSR routes it still needs to serve.
  adapter: vercel({ imageService: true }),
  // Inline all page CSS instead of linking external stylesheets: the mobile
  // Lighthouse audit measured ~750ms of render-blocking CSS on the critical
  // path (BaseLayout.css + page CSS) before first paint. Inlining trades a
  // slightly larger HTML payload for zero extra round trips.
  build: { inlineStylesheets: "always" },
  trailingSlash: "never",
  // /projects moved to /work in the console redesign (2026-07-03).
  redirects: {
    "/projects": "/work",
    "/projects/[slug]": "/work/[slug]",
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
      // noindex directive — the sitemap just never advertises them.
      filter: (page) => !page.includes("/dev/") && !page.includes("/for/"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
