import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://korabeland.com",
  output: "server",
  adapter: vercel(),
  integrations: [
    react(),
    mdx(),
    // Keystatic admin is dev-only — excluded from production builds so
    // /keystatic routes don't exist in deployed output. Content files are
    // committed to git and readable by Astro's content API in all envs.
    ...(process.env.NODE_ENV !== "production" ? [keystatic()] : []),
    sitemap({
      // Exclude dev-only preview pages from the public sitemap.
      filter: (page) => !page.includes("/dev/"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
