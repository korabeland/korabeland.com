# ADR: Anonymous visit counting through one filtered collector

**Date:** 2026-10-13 · **Status:** accepted · **Origin:** Ask the Operator build, PR 1 (captain-approved plan)

## Decision

The site counts visits with Vercel Web Analytics and keeps nothing else about a
visitor. Counting is browser-only: the site stores no identifier, session or
conversation anywhere.

## Why a direct client, not the adapter switch

Web Analytics was enabled on the Vercel project but the site shipped no
collector, so no visit was ever recorded; the dashboard switch alone counts
nothing. The `@astrojs/vercel` adapter can inject a collector
(`webAnalytics.enabled`), but offers no hook to clean URLs first. So the page
shell (`src/layouts/BaseLayout.astro`) loads the official `@vercel/analytics`
client once and the adapter switch stays off. **Never enable both:** each
pageview would count twice. `scripts/check-built-site.ts` fails the build if any
built citation does not resolve to a real route and anchor. The browser proof in
`tests/e2e/analytics.spec.ts` runs a frozen copy of Vercel's served collector and
checks its script request and pageview request, including URLs, headers and
body, with a secret-bearing incoming referrer. It also confirms tailored pages
do not load the collector and navigation works when the collector is blocked.

## What the filter does

`src/lib/analytics-privacy.ts`, applied through the client's `beforeSend`:

- Reports origin and path only. Query strings, fragments and trailing slashes
  are removed.
- Drops the event for `/for/*` (tailored pages), `/dev/*`, `/keystatic*` and
  `/api/*`.
- Reduces a referrer to the referring site's origin, and reports none when it
  has credentials, names an internal host, is not http(s), or is this site.
  The collector reads `document.referrer` itself, so the page replaces that
  value with the filtered one before the collector loads. If it cannot, nothing
  is counted.
- Sends no custom events and no event properties. Nothing runs on localhost.

## Limits

Hobby keeps one month of data and has no custom events. Counts are approximate
visits, not unique people.
