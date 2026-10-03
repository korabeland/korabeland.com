# Codex Review Loop — feat/ask-operator-corpus-index

- **Date:** 2026-08-06
- **Base:** origin/main
- **Head at completion:** see fix commit (loop converged on pass 3)
- **Passes run:** 3
- **Outcome:** clean

## Applied by the loop

Findings codex raised that Claude applied and that survived `verify`.

- [bug/medium] `src/lib/ask/corpus.ts` — markdown chunks derived GitHub-style fragment anchors, but the site renders `.mdoc` bodies through Markdoc's default transform (PostContent.tsx), which emits headings with no id attribute, so every derived fragment was a dead link. Applied the safe option: markdown-sourced chunks now carry empty anchors (route-only citations); `githubSlug`/`assignSlug` removed. Follow-up noted below.
- [bug/medium] `scripts/gen-corpus-index.ts` — status chunks cited `/about#location` and `/about#citizenship`, fragments the page never renders. Anchors now empty; the about pipeline also stops inventing an `about` fragment for heading-less lead text.
- [bug/medium, pass 2] `scripts/gen-corpus-index.ts` — the citizenship chunk asserted work authorization and nationalities, but `/about` visibly renders only relocation + citizenship (`STATUS.aboutLine`), so those citations could never be verified at their source. Also intersects the deliberate no-visible-availability-copy rule (PR #30). Trimmed the chunk to visibly-rendered facts; direct availability questions remain covered by U2's structured-fact path, which reads `STATUS` directly.
- [quality/low] `scripts/gen-corpus-index.ts` — marker extraction accepted duplicate `ABOUT-PROSE` markers silently; now validates exactly one START and one END, with duplicate/ordering test cases.

## Escalated to Korab (NOT applied)

None. One deliberate road-not-taken worth knowing about: codex's alternative fix for the anchor findings was to make the Markdoc renderer emit heading ids matching the corpus slugs. That changes rendered HTML on every note/case-study page, so it was not applied silently; if section-precise citations are wanted for the chat widget (U4), that renderer change plus reinstated slug derivation should land together as their own reviewed change.

## Reverted

None.

## Verify

- Final `pnpm verify:all`: pass
