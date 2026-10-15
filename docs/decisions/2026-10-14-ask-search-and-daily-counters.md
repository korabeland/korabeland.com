# ADR: Local search for "Ask about my work" and daily aggregate counters

**Date:** 2026-10-14 · **Status:** accepted · **Origin:** Ask the Operator build, PR 2 (captain-approved plan)

## Decision

The site gets an optional "Ask about my work" panel that searches the published
content in the visitor's own browser. It finds passages, shows an excerpt and a
link to the source page, and lists reading and contact links. It does not call a
model, use embeddings, or write answers. The only thing the server ever learns
is a count.

## What stays in the browser

- **Search.** The panel downloads `/ask-index.json` (the corrected index from
  PR 1, about 40 KB) the first time it opens and ranks passages on the device
  with plain keyword scoring plus a small synonym table.
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

## Placement

The trigger sits in the header and the panel is a native `<dialog>`, so the
browser supplies the focus trap, Escape to close and focus return. Pages with
`noindex` (tailored `/for/*` pages, `/off-trail`, `/404`, previews) do not get
the trigger, matching the analytics rule. Without JavaScript the trigger stays
hidden. Only a small opener loads with every page; the search and rendering code
loads on first open.

## Release questions

`docs/ask-release-questions.md` holds the forty release questions with their
evidence and rubric. They gate a later generated-answer feature, not this panel.
Korab must review all forty before that feature launches.
