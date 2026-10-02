// Runs after `astro build` (package.json `postbuild`): give the 404 catch-all
// route the same CSP header as the prerendered 404 page, then verify every
// emitted CSP still holds the baseline.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  assertHardenedCsp,
  uncoveredInlineScripts,
  withNotFoundCsp,
} from "./vercel-csp";

const OUTPUT = ".vercel/output";
const CONFIG_PATH = `${OUTPUT}/config.json`;

// Prerendered file behind a route: `/` -> index.html, `/about` -> about/index.html.
function pageFile(route: string): string | undefined {
  const rel = route === "/" ? "index.html" : `${route.slice(1)}/index.html`;
  const candidates = [
    `${OUTPUT}/static/${rel}`,
    `${OUTPUT}/static${route}.html`,
  ];
  return candidates.find((f) => existsSync(f));
}

try {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  const patched = withNotFoundCsp(config);
  const checked = assertHardenedCsp(patched);
  for (const route of patched.routes ?? []) {
    const policy = route.headers?.["content-security-policy"];
    const file = route.src && policy ? pageFile(route.src) : undefined;
    if (!policy || !file) continue;
    const missing = uncoveredInlineScripts(readFileSync(file, "utf8"), policy);
    if (missing.length > 0) {
      throw new Error(
        `${route.src}: inline scripts not allowed by its CSP: ${missing.join(" ")}`,
      );
    }
  }
  writeFileSync(CONFIG_PATH, `${JSON.stringify(patched, null, 2)}\n`);
  console.log(
    `patch-vercel-config: 404 catch-all patched; ${checked} CSP routes verified`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
