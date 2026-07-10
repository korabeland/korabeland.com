# Prompt 3 — Application scaffold

**Phase:** 1 (Foundation)
**Depends on:** Prompts 1 & 2 complete
**Expected outcome:** A working Astro 5 site with Keystatic, shadcn/ui, Tailwind 4, and Vercel adapter. Home page loads, one blog post renders. No design yet — that's Phase 3.

---

## Paste into Claude Code

```
Scaffold the application now. I want Astro 5 with these decisions pre-made
(do not ask me, just build):

- Astro 5 with TypeScript (strict mode)
- Tailwind CSS 4 integration
- shadcn/ui (the Astro-compatible port, or React islands if necessary)
- Keystatic as the local-git-backed CMS (no external CMS, no database)
- MDX support for blog content
- Vercel adapter configured for deployment
- Structure: src/pages (routes), src/components, src/content (Keystatic),
  src/layouts, src/lib (utilities)

Create a minimal home page with a hero placeholder, a blog index that reads
from Keystatic, and a single sample blog post. No styling beyond raw Tailwind
defaults — we'll handle design in Phase 3.

Update AGENTS.md section 1 with the actual stack now that it's real.
Update scripts/gen-barrels.ts to regenerate src/components/index.ts
deterministically from the folder structure.

Verify: pnpm build succeeds, pnpm dev runs, you can load localhost:4321
and see the home page and one blog post.

Commit as "feat: scaffold astro + keystatic + shadcn + tailwind".
```

---

## What to watch for

- `pnpm build` must exit 0 before this prompt is considered done
- `pnpm dev` should show home page at `localhost:4321` and blog post at `/blog/<slug>`
- Keystatic admin should be reachable at `/keystatic` (even if it's empty)
- `scripts/gen-barrels.ts` should regenerate `src/components/index.ts` without hand-editing
- Check that `AGENTS.md` section 1 was actually updated with real stack info, not left as placeholder

## Red flags to push back on

- Claude Code asking you which framework to pick — the prompt says "do not ask me"
- Skipping Keystatic "for now" — it's needed for Prompt 9
- Adding dependencies beyond what's listed (no Sanity, no Contentful, no external databases)
- `pnpm-lock.yaml` not committed — this must be in git for reproducibility

## If something breaks

Run `/fix-my-env` (that slash command exists after Prompt 5, so for now just paste the error into Claude Code directly).

---

**Revised 2026-04-19** — see `/office-hours` doc. The `src/pages/blog/` directory scaffolded here is removed (or gated) during revised Prompt 10 Step 1, since `/notes/[slug]` is deferred post-MVP. The Keystatic `posts` collection schema stays in place for future content.
