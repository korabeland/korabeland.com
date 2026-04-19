---
description: Diagnose a shell/environment error and return a one-line fix. Pass the error as an argument or it reads from clipboard.
---

You are diagnosing a shell or environment error in this exact stack: Astro 6, Tailwind CSS 4 (Vite plugin, CSS-first config), shadcn/ui (React islands via @astrojs/react), Keystatic local-git CMS, Vitest 2, Playwright 1.56+, Biome 2, TypeScript 5 strict, pnpm 10.33.0, Node 20.18.3, macOS Apple Silicon (M-series), Vercel SSR adapter (@astrojs/vercel@10).

Error to fix:
$ARGUMENTS

If $ARGUMENTS is empty, use the Bash tool to run `pbpaste` and treat the output as the error.

Rules:
- Return ONE shell command that fixes the problem. Nothing else in your response.
- Chain multiple steps with &&.
- If the fix is ambiguous, return: echo "Unclear — check [most likely config file or env var]"
- Never suggest deleting node_modules as a first resort.
