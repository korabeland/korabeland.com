// Privacy filter for Vercel Web Analytics. Pure functions, no DOM, so Vitest
// covers every rule with plain strings. src/lib/analytics-client.ts wires them
// into the browser; nothing else in the site talks to the collector.
//
// What the site lets the collector see: the page path (no query string, no
// fragment, no trailing slash) and, for visitors who arrived from another site,
// that site's origin. Nothing identifying is ever attached, and the site never
// sends custom events.

/** Paths that are never counted: tailored pages, dev previews, the CMS admin
 *  and any API route. The path itself can name a person or a campaign, so the
 *  event is dropped rather than recorded under a different name. */
const PRIVATE_PATH = /^\/(for|dev|keystatic|api)(\/|$)/;

/** Hosts a referrer must not name: local or internal addresses. */
function isInternalHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal"))
    return true;
  // IPv4 literal or IPv6 literal.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return true;
  }
  // A single-label host ("intranet") cannot be a public site.
  return !hostname.includes(".");
}

/** True when the page runs on a developer machine, where nothing is counted. */
export function isLocalHost(hostname: string): boolean {
  return isInternalHost(hostname);
}

/**
 * The URL to report for a pageview, or null to drop the event. Keeps origin
 * and path only. Unparseable input and private paths return null.
 */
export function sanitizeAnalyticsUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const path =
    url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "") || "/";
  if (PRIVATE_PATH.test(path)) return null;
  return `${url.origin}${path}`;
}

/**
 * The referrer to report: the referring site's origin, or "" when it should
 * not be reported. Dropped when it is empty, malformed, not http(s), carries
 * credentials, names an internal host, or is this site itself (an internal
 * navigation is not a referral, and a private page here must not surface).
 */
export function sanitizeReferrer(raw: string, siteHost: string): string {
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (url.username || url.password) return "";
  if (isInternalHost(url.hostname)) return "";
  if (url.host === siteHost) return "";
  return `${url.protocol}//${url.host}/`;
}

export interface AnalyticsEvent {
  type: string;
  url: string;
}

/** The hook the collector calls before sending: clean the URL or cancel. */
export function filterAnalyticsEvent<T extends AnalyticsEvent>(
  event: T,
): T | null {
  const url = sanitizeAnalyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}
