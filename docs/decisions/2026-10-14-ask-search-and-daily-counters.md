# ADR: Local search for "Ask about my work" and daily aggregate counters

**Date:** 2026-10-14 · **Status:** accepted · **Origin:** Ask the Operator build, PR 2 (captain-approved plan)

## Decision

The site gets an optional "Ask about my work" panel that searches the published
content in the visitor's own browser. It finds passages, shows an excerpt and a
link to the source page, and lists reading and contact links. It does not call a
model, use embeddings, or write answers. Search questions stay in the browser;
the panel sends only anonymous event counts.

## What stays in the browser

- **Search.** The panel downloads `/ask-index.json` (the corrected index from
  PR 1, about 40 KB) the first time it opens and ranks passages on the device
  with plain keyword scoring plus a small synonym table. The index contains
  reader-facing site pages and excludes machine-facing files such as
  `llms.txt` and `llms-full.txt`.
- **History.** The questions typed in a tab are kept in that tab's
  `sessionStorage`. They survive moving between pages, can be cleared with a
  button, and end with the tab's session. Results are recomputed from the index
  each time; only the question text is stored. A second question sends nothing
  from the first, because nothing is sent at all.

## What the server counts

`POST /api/ask-count` accepts exactly `{"event": "<name>"}` and nothing else. The
five names are `open`, `question`, `answer`, `fallback` and `error`. Each adds
one to a number in the shared Upstash Redis store (the Vercel integration
variables `KV_REST_API_URL` and `KV_REST_API_TOKEN`).

- **Key shape.** One hash per environment per UTC day, for example
  `ask:production:2026-10-14`, with the five names as its fields. Preview
  deployments write under `ask:preview:...`, so they never mix with production.
  Local development writes nothing because Vercel sets no environment there.
- **Expiry.** Each day's key expires after 400 days (set once, by `EXPIRE ... NX`).
- **No identifier.** No session id, cookie, address, user agent, question text or
  timestamp finer than the day is stored. The endpoint reads none of those
  headers except `Sec-Fetch-Site`/`Origin` to refuse other sites, and logs only
  a fixed message when a write fails.
- **Opens.** Counted once per browser session: a flag in `sessionStorage` stops a
  second open in the same session from counting again. The flag is the string
  `1`; it is not an identifier.
- **Failure.** The browser never waits for a count. If the endpoint or the store
  is down, search works exactly the same. The endpoint answers 204 even when the
  store write fails.

## Keeping the free plan safe

The store is Upstash's Free plan: 500,000 commands a month, with throttling
rather than billing when the limit is passed. Each count costs two commands
(`HINCRBY`, `EXPIRE NX`) in one request. A visitor who opens the panel and asks
two questions causes about five counts, so about ten commands. Ordinary traffic
of a few hundred such visitors a month is under 1% of the allowance.

Three guards stop a flood from reaching it:

1. Opens are deduplicated per session in the browser.
2. The endpoint refuses anything but a same-origin JSON request with an exact
   one-field body, before touching the store.
3. Each running server instance writes at most 30 counts a minute and silently
   drops the rest.

These bound ordinary and accidental load. They do not stop a determined attacker
who spreads requests over many instances or many minutes, and the app has no
other way to bound that without storing state. If that ever matters, add a
Vercel Firewall rate-limit rule for `/api/ask-count` (the Hobby plan includes
one). Nothing here upgrades the store or adds a paid feature.

## Exporting numbers

- `pnpm export:pageviews` prints monthly pageview totals as CSV from
  Vercel Web Analytics through the `vercel` CLI login. The Hobby plan guarantees
  one month of analytics, so run it on the first UTC day of each month to export
  the prior completed month. The command rejects later dates because the full
  month is no longer guaranteed to be available. Use
  `pnpm --silent export:pageviews > pageviews-YYYY-MM.csv` to keep pnpm's
  command banner out of the CSV file.

## Placement and design (About page only)

Captain decisions, 2026-10-15: limit the feature to a single page until it is
more developed, put it on About, and treat it as a design task rather than a
relocation. Nothing else renders it or loads its script; the header and the
shared page shell carry no trace of it. Search still covers the whole index, so
results may link to any page.

**(a) Where.** Between the career narrative and "how I operate". A visitor has
just read the short version of the story and is most likely to want a specific
(a result, a method, a tool). Placing it there makes it the next beat of the
page, not a widget bolted on the header. It uses the site's own section grammar
(mono section head over a 1px rule, ledger-style rows, hairlines, the one signal
accent, sharp corners, no shadows), so it reads as part of the page in both
shifts.

**(b) Discovery.** One sentence in the site's first-person voice ("The story
above is the short version. Ask for a specific and I will point you to the page
that answers it.") over four example questions drawn from what About and the
case studies really answer: the lead scoring result, the Keypath work, how the
SMS pilot was measured, and the tools list. The examples are ledger rows with a
return glyph, each at least 48px tall and full width, so one thumb tap shows a
useful result. Below them is a field labelled "Or ask your own". A test holds
every example to a result on the page that answers it. A short honest note says
what the feature is: search on the visitor's device, no written answers,
questions kept in the tab only.

**(c) Inline, not an overlay.** The visitor reads results, compares them and
opens sources, so the page they are reading must stay in reach. A modal would
cover the experience ledger below, trap focus, and fight the phone keyboard
(a bottom sheet plus a keyboard leaves a sliver of screen). Inline also needs no
open and close state, and the history is waiting there when they return from a
source. The cost is that results push the lower page down. Results are capped
at four sources, and earlier questions fold under their own question line
("+"), so the section stays short.

**(d) States.**
- *Idle:* invitation, four example rows, an empty field, the note, reading and
  contact links. Nothing is shown for history.
- *Typing:* a plain search field (16px so iOS does not zoom). An empty submit
  says "Type a question first." and sends nothing, not even a count.
- *Searching:* the question is saved to the tab's history first, then the
  status line reads "Searching…" and the results region is marked busy. Local
  search itself is instant; the only wait is the first download of the index.
- *Results:* the newest question is open with up to four sources, each with a
  type label, a linked title, an excerpt with the matched words highlighted, and
  the source path. The status line announces "N sources found for ...".
- *No match:* a plain sentence, then reading links and contact links.
- *Search unavailable:* if the index cannot be fetched, the same reading and
  contact links appear with "Search could not load."
- *Cleared:* the history is removed, the status line says "History cleared.",
  and focus returns to the field. A search still in flight when history is
  cleared cannot bring the question back.
- *Counter failure:* nothing visible, by design. Search never waits for a count.
- *No JavaScript:* the section is hidden, so there is no form that does nothing.

**Interaction details.** Keyboard: the example rows, field, search, clear
history and the folds are all native controls in reading order; Enter works on
all of them. Screen readers: one polite status region announces searching,
counts, no match and cleared; results carry real headings, lists and links.
Motion: no animation. After a search the newest result scrolls into view
(smoothly only if the visitor has not asked for reduced motion). One-handed on
a phone: rows and buttons are at least 44px, the field and its button stack
full width under 680px, and nothing is fixed to the screen.

**Counting.** The "open" count now means the first time in a browser session
that the visitor reaches for the section (focus or press inside it). Showing
history carried over from an earlier page is not an open.

**Loading.** Only a small script ships with the About page. It reveals the
section and loads the search code when the browser is idle, or at once if the
tab already has history or the visitor reaches for the section first.

Widening placement later means rendering `AskSection` on more pages.

## Release questions

`docs/ask-release-questions.md` holds the forty release questions with their
evidence and rubric. They gate a later generated-answer feature, not this panel.
Korab must review all forty before that feature launches.
