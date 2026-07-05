# Tailored pages (`/for/[slug]`)

Unlisted, per-role landing pages assembled from the shared content pool. Sent as
a direct link to a specific hiring manager; never linked from the site,
`noindex`, and excluded from the sitemap.

## Anatomy

A tailored page is config, not prose. The only free-form copy is the `intro`.
Everything else is an **explicit, ordered reference** into the existing pool:

- `experienceRefs` — experience entries, in the order shown
- `projectRefs` — case studies, shown as exit links to `/work/<slug>`
- `skillCategories` — skill-category names from the skills singleton

References resolve at build time and **fail loud**: a dangling reference — or a
config that resolves to no content at all — fails the build rather than shipping
a hollow page. Because pages store refs (not tag queries), renaming a tag can
never silently gut a page that has already been sent.

## Creating one (the runbook — F1)

1. Tell the agent the company/role. It drafts `src/content/for/<company>/index.yaml`:
   - `slug` / `displayName`
   - `intro` — the bespoke opening
   - ordered `projectRefs` / `experienceRefs` (chosen via tags, for discovery)
   - optional `skillCategories`
2. Korab reviews. Run the disclosure grep gate over the intro before committing.
3. Commit + push → Vercel deploys the page.
4. Send the link: `korabeland.com/for/<slug>`.

## Editing / previewing

- Keystatic admin (dev): the **Tailored pages** collection.
- Locally, `/for/<slug>` renders under `pnpm dev`; a broken reference fails
  `pnpm build`.

## Deleting

Delete `src/content/for/<company>/` on application conclusion (offer or
rejection), not on send. A stale link then 404s to the off-trail page, which
has a path home.

## Why `noindex`, not a robots disallow

A `robots.txt` disallow would stop crawlers from ever *reading* the `noindex`
directive. Sitemap exclusion + `noindex` is the correct pair — deliberately
different from the `/dev/` recipe.

## The permanent `demo` fixture

`src/content/for/demo/` is a committed CI anchor (`/for/demo`). It references
only the always-present case studies, so the fail-loud resolver never breaks the
build while the experience collection and skills singleton are still empty. Do
not delete it.
