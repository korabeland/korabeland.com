// Reads the static portrait variants that scripts/gen-hero-variants.ts writes to
// public/portrait/ and turns them into the srcsets the <picture> and the head
// preload both render. One reader keeps those two surfaces from drifting.
//
// Variants live in a fixed output dir (see gen-hero-variants' PORTRAIT_OUT_DIR),
// referenced by absolute paths: Portrait renders at differently nested routes
// (/ and /about), so the relative-URL trick the Keystatic hero components use
// doesn't apply.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface PortraitMeta {
  width: number;
  height: number;
  widths: number[];
}

export interface PortraitPicture {
  avifSrcset: string;
  webpSrcset: string;
  fallbackSrc: string;
  width: number;
  height: number;
}

export function loadPortraitPicture(basename: string): PortraitPicture {
  const metaPath = resolve(
    process.cwd(),
    "public/portrait",
    `${basename}.gen.meta.json`,
  );
  if (!existsSync(metaPath)) {
    throw new Error(
      `Portrait: missing variants for "${basename}" (expected ${metaPath}). Run \`pnpm exec tsx scripts/gen-hero-variants.ts\` — see scripts/gen-hero-variants.ts.`,
    );
  }
  const meta: PortraitMeta = JSON.parse(readFileSync(metaPath, "utf8"));
  return {
    avifSrcset: meta.widths
      .map((w) => `/portrait/${basename}.gen.${w}.avif ${w}w`)
      .join(", "),
    webpSrcset: meta.widths
      .map((w) => `/portrait/${basename}.gen.${w}.webp ${w}w`)
      .join(", "),
    fallbackSrc: `/portrait/${basename}.gen.720.jpg`,
    width: meta.width,
    height: meta.height,
  };
}
