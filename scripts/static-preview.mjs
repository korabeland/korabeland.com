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
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

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
  ".avif": "image/avif",
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
  // Strip the query string, splitting only at the FIRST "?" so an asset URL
  // that itself carries a query string isn't truncated.
  const q = urlPath.indexOf("?");
  const rawPath = q === -1 ? urlPath : urlPath.slice(0, q);
  const query = q === -1 ? "" : urlPath.slice(q + 1);
  const cleanPath = rawPath || "/";

  // Vercel image-optimizer shim. With `imageService: true` the built <Image>
  // markup points at `/_vercel/image?url=<asset>&w=&q=`, an endpoint only
  // Vercel provides at runtime. This preview has no optimizer, so serve the
  // underlying asset from dist directly — otherwise the portrait (the LCP
  // element on `/`) 404s and the perf audit silently measures a page with no
  // hero image, hiding the effect of `fetchpriority`.
  if (cleanPath === "/_vercel/image") {
    const inner = new URLSearchParams(query).get("url");
    if (inner) {
      // URLSearchParams.get() already percent-decodes, so use `inner` as-is —
      // a second decodeURIComponent would throw URIError on a literal `%`.
      // Resolve, then confine to ROOT via a prefix check — robust against `..`
      // escapes (a bare `..` slips past a regex but not resolve+startsWith).
      const target = resolve(ROOT, inner.replace(/^\/+/, ""));
      if (target === ROOT || target.startsWith(ROOT + sep)) {
        const body = await tryRead(target);
        if (body) return { body, path: target };
      }
    }
    return null;
  }

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
    const headers = {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    };
    // Compress text responses when the client accepts gzip. Production
    // (Vercel) always serves text brotli/gzip-compressed — without this the
    // Lighthouse audit charges the full raw HTML/CSS/JS weight against the
    // simulated slow-4G budget and measures a delivery penalty production
    // doesn't have (123KB raw vs ~25KB compressed for the home document).
    // Images are already-compressed formats; leave them as-is.
    const compressible = /^\.(html|css|js|json|svg|txt|xml)$/.test(ext);
    if (
      compressible &&
      (req.headers["accept-encoding"] ?? "").includes("gzip")
    ) {
      headers["Content-Encoding"] = "gzip";
      res.writeHead(200, headers);
      res.end(gzipSync(hit.body));
      return;
    }
    res.writeHead(200, headers);
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
