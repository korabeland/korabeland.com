# CLAUDE.md — korabeland.com

Personal site ("The Front Door") — who Korab is as a whole person, what he's building, where to go next.

## Current Scope

Status: March 2026. The site is in a WIP state while content is refined.

Required pages: `/` home, `/about`, `/blog/`, `/blog/[slug]/`

Required CTAs on home:
- Email me
- Download resume (use `/downloads/Korab_Eland_Resume.pdf`, never `.docx`)

WIP behavior:
- All required routes currently render a shared WIP state.
- Do not reintroduce a case studies CTA unless explicitly requested by Korab.
- Keep copy concise, direct, and consistent with the existing tone.

## Content Rules

- Blog content lives in `src/content/blog/`.
- Follow schema in `src/content.config.ts`.
- Use `status: draft | published` to control visibility.

## Design Direction

**Before making any design, layout, typography, or styling choices**, read `personal-site-brief.md` in full. It is the source of truth for the site's aesthetic and technical requirements.

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
