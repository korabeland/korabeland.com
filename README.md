# korabeland.com

Korab Eland's personal site — a small, fast "console" that says who he is and shows the work. Live at [korabeland.com](https://korabeland.com).

The site's own thesis is its headline: *turn ambiguous problems into systems that ship.* This repo is one of those systems — a static-by-default Astro site, built and maintained by an AI team orchestrated through [Claude Code](https://claude.com/claude-code), with every change reviewed on a Vercel preview before it lands.

---

## What's on it

The home page is the console: a hero readout, then a set of ledgers that fill in as the work does.

- **Home (`/`)** — the positioning line, a portrait whose gaze follows the cursor, and the outcome ledger of recent case studies. Below that: a year of GitHub activity (the *shift log*), AI code tinkering (the *lab*), and recent notes.
- **Work (`/work`)** — case studies. The three most recent are featured on the home ledger; the full set lives here.
- **Lab (`/lab`)** — personal AI code experiments, kept in a separate band so they never mix with the client work.
- **Notes (`/notes`)** — field notes and longer-form writing.
- **About (`/about`)** — the career narrative across thirteen years in marketing, CX and operations, plus a skills summary.
- **Colophon (`/colophon`)** — how the site was built, and its own git build log: every commit, in the open.

A few routes are deliberately quiet: `/for/<slug>` renders unlisted, tailored landing pages (noindex, excluded from the sitemap); `/off-trail` is the SSR companion to the 404; `/og.png` generates the social-share card on the fly.

---

## How it's built

- **[Astro 6](https://astro.build)** (TypeScript, strict) — page routing. Static by default; only `/off-trail` and the dev-only previews opt into SSR.
- **[Tailwind CSS 4](https://tailwindcss.com)** — CSS-first config, design tokens in `src/styles/tokens.css`.
- **[shadcn/ui](https://ui.shadcn.com) + React 19** — interactive islands, used only where they earn their weight.
- **[Keystatic](https://keystatic.com)** — a local-git-backed CMS for posts, projects, experience and tailored pages. Admin UI at `/keystatic` in dev.
- **[Vercel](https://vercel.com)** — hosting, preview deploys, and the edge functions behind the SSR routes.

The site is small on purpose; the build pipeline does most of the work behind the scenes. Some content isn't authored by hand but generated at build time from real activity:

- the colophon's **build log** comes from this repo's `git log`,
- the home page's **shift log** comes from the GitHub contributions API,
- the hero portrait's responsive image variants and its cursor-tracking **gaze rig** are both generated pre-build.

Each generator writes a gitignored file and falls back to a committed seed, so tokenless and shallow-clone builds still render.

One detail worth calling out: Korab's location, work authorization, citizenship and nationality live in a **single source of truth** (`src/lib/status.ts`). The hero readout, the about page and the site's JSON-LD all import from it, so those facts can never drift apart.

---

## Built by an AI team

The distinctive thing about this repo is *how* it's maintained. Korab works it solo, in natural language, through Claude Code and a small crew of subagents:

- **Instructions** go to `claude` in a terminal — no code editing required.
- **Review** happens on Vercel preview URLs (often from a phone) and in Chromatic's visual-diff queue.
- **Every change** ships as a pull request with a review page: preview link, screenshots at four viewports, before/after diffs, and a plain-English summary.

Quality gates run on every PR before anything merges: Biome + `tsc` + `astro check`, Vitest, Playwright visual + accessibility (axe) tests, Lighthouse, and an automated code review. Nothing lands red.

The conventions the AI team follows — directory layout, file-ownership rules, the change-trigger matrix, the merge workflow — live in [`AGENTS.md`](AGENTS.md). Start there to understand the codebase.

---

## Working in the repo

Node 22 (pinned in `.nvmrc`) and pnpm. Then:

```sh
pnpm install
pnpm dev        # local dev server
```

Common tasks:

| Command | What it does |
|---|---|
| `pnpm dev` | Local dev server (`astro dev`) |
| `pnpm build` | Production build (runs the generators first) |
| `pnpm verify` | Biome + `tsc --noEmit` + `astro check` |
| `pnpm test` | Vitest (unit / logic) |
| `pnpm test:visual` | Playwright visual + E2E + axe |
| `pnpm run lighthouse` | Lighthouse CI (desktop + mobile) |
| `pnpm verify:all` | All of the above, chained — the pre-PR gate |

See [`AGENTS.md`](AGENTS.md) §2 for the full command reference and testing conventions. The system's original design notes are in [`docs/setup-prompts/`](docs/setup-prompts/).
