// Shared hero <picture> source builder for ReadingRoom (posts) and CaseStudy
// (projects). heroImage arrives as the bare Keystatic filename; variants live
// next to the source under the collection's fixed public directory and are
// emitted by scripts/gen-hero-variants.ts via predev/prebuild. Srcset/src
// values stay relative on purpose — they resolve against the /notes/<slug>
// or /work/<slug> URL exactly like the original bare <img src> did. The two
// components keep their own `sizes` contracts (620px reading column vs
// 1000px case-study header) — only the variant plumbing is shared.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface HeroMeta {
  width: number;
  height: number;
  widths: number[];
}

export interface HeroPicture {
  avifSrcset: string;
  webpSrcset: string;
  fallbackSrc: string;
  width: number;
  height: number;
}

export function loadHeroPicture(
  publicDir: string,
  filename: string,
  caller: string,
): HeroPicture {
  const basename = filename.replace(/\.[^./]+$/, "");
  const metaPath = resolve(
    process.cwd(),
    publicDir,
    `${basename}.gen.meta.json`,
  );
  if (!existsSync(metaPath)) {
    throw new Error(
      `${caller}: missing hero variants for "${filename}" (expected ${metaPath}). Run \`pnpm exec tsx scripts/gen-hero-variants.ts\` — see scripts/gen-hero-variants.ts.`,
    );
  }
  const meta: HeroMeta = JSON.parse(readFileSync(metaPath, "utf8"));
  return {
    avifSrcset: meta.widths
      .map((w) => `${basename}.gen.${w}.avif ${w}w`)
      .join(", "),
    webpSrcset: meta.widths
      .map((w) => `${basename}.gen.${w}.webp ${w}w`)
      .join(", "),
    fallbackSrc: `${basename}.gen.960.png`,
    width: meta.width,
    height: meta.height,
  };
}
