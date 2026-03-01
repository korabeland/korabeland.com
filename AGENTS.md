# AGENTS.md - Personal Site

This file guides coding agents working inside `korabeland.com/` (`korabeland.com`).

For brand-level strategy, voice, and content pillars, refer to `../AGENTS.md`.

## Repository Purpose

This site is the "Front Door":
- who Korab is
- what he is building
- where to go next (GitHub and direct contact)

## Current Scope

Status date: March 1, 2026

The site is intentionally in a temporary work-in-progress state while content is refined.

Required pages:
- `/` home
- `/about`
- `/blog/`
- `/blog/[slug]/`

Required CTAs on home:
- Email me
- Download resume

WIP behavior:
- All required routes currently render a shared WIP state.
- Do not reintroduce a case studies CTA unless explicitly requested by Korab.
- Keep copy concise, direct, and consistent with the existing tone.

Resume delivery:
- Use `/downloads/Korab_Eland_Resume.pdf`.
- Do not link to `.docx` resume files.

## Content Rules

- Use `src/content/blog/` for essays and notes.
- Follow schema in `src/content.config.ts`.
- Use `status: draft | published` to control visibility.

## Design Direction

- Clean, intentional, human.
- Distinctive but restrained.
- Fast, readable, mobile-first.

## Implementation Notes

- Keep dependencies minimal.
- Prefer static output.
- Keep JS usage low unless interaction clearly requires it.
- Deployment target is Vercel project `korabeland.com` with GitHub-connected deploys from `main`.
