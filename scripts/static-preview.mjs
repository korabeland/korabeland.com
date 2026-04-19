#!/usr/bin/env node

// Minimal static preview server for the prerendered output under
// `dist/client/`. Used by Lighthouse CI (and local perf audits) because
// @astrojs/vercel doesn't support `astro preview`.
//
// Serves /<path> from dist/client/<path>:
//   · `/`              → dist/client/index.html
//   · `/colophon`      → dist/client/colophon/index.html
//   · `/favicon.ico`   → dist/client/favicon.ico (404 if missing)
//   · unknown paths    → dist/client/404.html with HTTP 404
//
// No framework, no deps — built on node:http + node:fs.

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..", "dist", "client");
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff2": "font/woff2",
};

async function tryRead(candidatePath) {
  try {
    const s = await stat(candidatePath);
    if (s.isFile()) return await readFile(candidatePath);
  } catch {
    // fall through
  }
  return null;
}

async function resolveRequest(urlPath) {
  // Strip query string
  const cleanPath = urlPath.split("?")[0] || "/";
  // Drop leading slash and protect against .. traversal
  const safe = cleanPath.replace(/\.+\//g, "/").replace(/^\/+/, "");
  const candidates = [];
  if (safe === "" || safe.endsWith("/")) {
    candidates.push(join(ROOT, safe, "index.html"));
  } else if (!extname(safe)) {
    candidates.push(join(ROOT, safe, "index.html"));
    candidates.push(join(ROOT, `${safe}.html`));
    candidates.push(join(ROOT, safe));
  } else {
    candidates.push(join(ROOT, safe));
  }
  for (const c of candidates) {
    const body = await tryRead(c);
    if (body) return { body, path: c };
  }
  return null;
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("bad request");
    return;
  }
  const hit = await resolveRequest(req.url);
  if (hit) {
    const ext = extname(hit.path);
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(hit.body);
    return;
  }
  const fallback = await tryRead(join(ROOT, "404.html"));
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fallback ?? "<!doctype html><title>404</title><h1>404</h1>");
});

server.listen(PORT, () => {
  console.log(`static-preview: serving ${ROOT} at http://localhost:${PORT}`);
});
