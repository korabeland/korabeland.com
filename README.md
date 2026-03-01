# Korab Eland | Personal Site

This repository powers `korabeland.com`, the "Front Door" in the brand architecture.

## Purpose

Show who Korab is as a builder and operator:
- concise personal narrative
- essays and process notes
- clear paths to code and contact

## Stack

- Astro 5
- Markdown content collections
- Static output for deployment on Vercel

## Local Development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Content

Blog content lives in `src/content/blog/` and follows the frontmatter schema defined in `src/content.config.ts`.

## Current Status (March 1, 2026)

- Temporary work-in-progress mode is active.
- Routes `/`, `/about`, `/blog/`, and `/blog/[slug]/` intentionally render WIP messaging.
- Home CTAs are:
  - Email me
  - Download resume
- Resume download is PDF only: `/downloads/Korab_Eland_Resume.pdf`.
- Case studies CTA is intentionally removed during this phase.

## Deployment

- Vercel project: `korabeland.com`
- Production domains: `https://korabeland.com` and `https://www.korabeland.com`
- GitHub repo: `https://github.com/korabeland/korabeland.com`
- GitHub auto-deploy is connected on pushes to `main`
