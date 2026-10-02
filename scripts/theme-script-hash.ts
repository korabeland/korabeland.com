import { createHash } from "node:crypto";

// Astro leaves `is:inline` scripts out of the CSP it builds, so each one needs
// its hash listed by hand. This returns the CSP hash of the single script that
// sits between `<MARKER>:START` and `<MARKER>:END` in a source file; the
// rendered page carries these exact bytes, so the hash matches both static and
// server-rendered responses without a 'unsafe-inline' for scripts.
function inlineScriptHash(source: string, marker: string): string {
  const block = source.match(
    new RegExp(`${marker}:START([\\s\\S]*?)${marker}:END`),
  );
  const script = block?.[1].match(
    /<script is:inline(?:"[^"]*"|'[^']*'|[^>])*>([\s\S]*?)<\/script>/,
  );
  if (!script) {
    throw new Error(
      `theme-script-hash: no <script is:inline> inside the ${marker} markers`,
    );
  }
  return `sha256-${createHash("sha256").update(script[1]).digest("base64")}`;
}

// The pre-paint theme script in BaseLayout (the SHIFT-RESOLVE block that
// tests/shift-parity.test.ts evaluates).
export function themeScriptHash(layoutSource: string): string {
  return inlineScriptHash(layoutSource, "SHIFT-RESOLVE");
}

// The LCP preload injector in Portrait/PortraitPreload.astro.
export function portraitPreloadScriptHash(componentSource: string): string {
  return inlineScriptHash(componentSource, "PORTRAIT-PRELOAD");
}
