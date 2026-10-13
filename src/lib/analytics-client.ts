// Starts Vercel Web Analytics exactly once per page load, behind the privacy
// filter. The official client is imported by the page shell and passed in, so
// this module has no import of its own and Vitest can drive it with fakes.
//
// This is the site's only collector. The Vercel adapter's own `webAnalytics`
// switch is deliberately left off: it has no privacy hook, and two collectors
// would count every pageview twice.

import {
  filterAnalyticsEvent,
  isLocalHost,
  sanitizeReferrer,
} from "./analytics-privacy";

export type AnalyticsClient = (options: {
  mode: "production";
  beforeSend: typeof filterAnalyticsEvent;
}) => void;

export interface AnalyticsEnvironment {
  /** The page's `document`: only `referrer` is touched. */
  document: Pick<Document, "referrer">;
  location: Pick<Location, "host" | "hostname" | "pathname">;
  enabled: boolean;
}

/**
 * Returns true when the collector was started. It is not started on a
 * developer machine, and not started at all if the referrer cannot be made
 * safe: the collector reads `document.referrer` itself, so it is replaced with
 * the filtered value before the collector loads, and a failure to do so
 * counts nothing rather than leaking the original.
 */
export function startAnalytics(
  inject: AnalyticsClient,
  env: AnalyticsEnvironment,
): boolean {
  if (
    !env.enabled ||
    isLocalHost(env.location.hostname) ||
    /^\/(for|dev|keystatic|api)(\/|$)/.test(env.location.pathname)
  ) {
    return false;
  }
  const safeReferrer = sanitizeReferrer(
    env.document.referrer,
    env.location.host,
  );
  try {
    Object.defineProperty(env.document, "referrer", {
      configurable: true,
      get: () => safeReferrer,
    });
  } catch {
    return false;
  }
  inject({ mode: "production", beforeSend: filterAnalyticsEvent });
  return true;
}
