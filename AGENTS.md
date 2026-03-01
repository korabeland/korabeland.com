# AGENTS.md - Personal Site

This file guides coding agents working inside `personal-site/` (`korabeland.com`).

For brand-level strategy, voice, and content pillars, refer to `../AGENTS.md`.

## Repository Purpose

This site is the "Front Door":
- who Korab is
- what he is building
- where to go next (portfolio and GitHub)

## Current Scope

MVP target date: March 1, 2026

Required pages:
- `/` home
- `/about`
- `/blog/`
- `/blog/[slug]/`

Required CTAs on home:
- Email me
- View case studies
- Download resume

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

