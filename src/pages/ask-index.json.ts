// The Ask panel's search corpus, served as a static file. The browser fetches
// it the first time the panel opens and searches it locally; nothing about a
// visitor's question ever goes back. Built from src/content/ask-index/corpus.json,
// which scripts/gen-corpus-index.ts regenerates on every dev start and build.

import type { APIRoute } from "astro";
import corpus from "../content/ask-index/corpus.json";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(corpus), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
