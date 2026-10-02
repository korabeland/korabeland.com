import { createHash } from "node:crypto";

// The pre-paint theme script in BaseLayout is `is:inline`, so Astro leaves it
// out of the CSP it builds. This returns its CSP hash from the layout source
// (the same SHIFT-RESOLVE block tests/shift-parity.test.ts evaluates); the
// rendered page carries these exact bytes, so the hash matches both static and
// server-rendered responses without a 'unsafe-inline' for scripts.
export function themeScriptHash(layoutSource: string): string {
  const block = layoutSource.match(
    /SHIFT-RESOLVE:START([\s\S]*?)SHIFT-RESOLVE:END/,
  );
  const script = block?.[1].match(/<script is:inline>([\s\S]*?)<\/script>/);
  if (!script) {
    throw new Error(
      "theme-script-hash: no <script is:inline> inside the SHIFT-RESOLVE markers in BaseLayout.astro",
    );
  }
  return `sha256-${createHash("sha256").update(script[1]).digest("base64")}`;
}
