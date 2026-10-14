// POST /api/ask-count — adds one to a daily aggregate counter for the Ask
// panel. Body: {"event":"open"|"question"|"answer"|"fallback"|"error"}.
// Question text never reaches the server. SSR on purpose; everything else on
// the site is static. Logic and tests live in src/lib/ask/count-handler.ts.

import type { APIRoute } from "astro";
import {
  createThrottle,
  handleCountRequest,
} from "../../lib/ask/count-handler";

export const prerender = false;

const throttle = createThrottle();

export const ALL: APIRoute = ({ request }) => {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  return handleCountRequest(request, {
    vercelEnv: process.env.VERCEL_ENV,
    store: url && token ? { url: url.replace(/\/$/, ""), token } : null,
    fetch: (input, init) => fetch(input, init),
    throttle,
    now: () => new Date(),
    log: (message) => console.error(message),
  });
};
