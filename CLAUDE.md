# CLAUDE.md — korabeland.com

Personal site ("The Front Door") — who Korab is as a whole person, what he's building, where to go next.

## Current Scope

Status: March 2026. MVP live — home, about, blog, project case study pages.

Required pages: `/` home, `/about`, `/blog/`, `/blog/[slug]`, `/projects/[slug]`

Required CTAs on home:
- Email me
- Download resume (use `/korab-eland-resume.pdf`, never `.docx`)

Content collections:
- Blog: `src/content/blog/` — posts with `status: draft | published`
- Projects: `src/content/projects/` — case studies as MDX
- Now: `src/content/now/` — compact status update shown on home page

## Content Rules

- Blog content lives in `src/content/blog/`.
- Follow schema in `src/content.config.ts`.
- Use `status: draft | published` to control visibility.

## Design Direction

**Before making any design, layout, typography, or styling choices**, read the design doc first: `~/.gstack/projects/korabeland-personal-brand/korabeland-main-design-20260326-215957.md`. It supersedes `personal-site-brief.md` for page structure and content architecture. The original brief's visual system rules (typography, color, spacing, "no gradients/shadows/decorations") remain in effect.

- Clean, intentional, human.
- Distinctive but restrained.
- Fast, readable, mobile-first.

Style tile: `../design/korabeland-com.pen` contains approved visual direction (typography, colors, components, light/dark tokens).

## Implementation

- **Tech:** Astro (MDX, file-based routing)
- **Deployment:** Vercel project `korabeland.com`, GitHub-connected deploys from `main`
- Keep dependencies minimal. Prefer static output. Keep JS usage low.

## Brand Context

Read these from the parent repo when brand-level context is needed:
- `../CLAUDE.md` — architecture, collaboration model, session hygiene
- `../STRATEGY.md` — mission, positioning, audience, content pillars
- `../identity/` — brand foundation (voice, values, personality, archetype)
