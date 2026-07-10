#!/usr/bin/env tsx
// Generates width-tiered AVIF/WebP/PNG variants for Keystatic hero images
// (posts + projects) so ReadingRoom/CaseStudy never ship the original,
// multi-MB `public/` source to the browser. `imageService: true` (see
// astro.config.mjs) makes astro:assets/<Image> unusable for public/ paths on
// this site — it ignores requested widths/formats — so this script does the
// resizing itself, ahead of build, the same way the favicons already bypass
// the pipeline (see BaseLayout.astro).
//
// Unlike gen-trail-register/gen-shift-log, there is no committed seed to
// fall back to: a failure here must stop the build loudly, not silently
// ship the unoptimized original.

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { createReader } from "@keystatic/core/reader";
import sharp, { type Sharp } from "sharp";
import keystaticConfig from "../keystatic.config";

const repoRoot = resolve(process.cwd());

const WIDTHS = [640, 960, 1280] as const;
const PNG_FALLBACK_WIDTH = 960;
const MAX_BYTES = 200 * 1024;

// Quality ladders to step down through when the default quality overshoots
// the 200KB budget. AVIF compresses hardest, so it can start low; PNG needs
// palette quantization (libimagequant) to hit budget on a photographic hero.
const AVIF_QUALITIES = [50, 42, 34, 26, 20];
const WEBP_QUALITIES = [75, 65, 55, 45, 35];
const PNG_QUALITIES = [90, 80, 70, 60, 50, 40];

interface HeroSource {
  /** Absolute path to the source file on disk. */
  diskPath: string;
  /** Human label for logging, e.g. "post:system-designer-personal-os". */
  label: string;
}

/**
 * `fields.image`'s reader value is just the filename ("personal-os-hero.png"),
 * not a resolved public URL — the collection's `directory` (e.g.
 * "public/notes") supplies the rest. Pulled straight off the live
 * keystatic.config.ts schema rather than hardcoded, so this script can't
 * silently drift from the collection config it's generating variants for.
 */
function heroDirectory(schema: Record<string, unknown>): string {
  const field = schema.heroImage as { directory?: string } | undefined;
  const directory = field?.directory;
  if (!directory) {
    throw new Error(
      "gen-hero-variants: heroImage field is missing a `directory` — check keystatic.config.ts",
    );
  }
  return directory;
}

/**
 * Reads heroImage directly off the raw Keystatic entries rather than through
 * `listPosts()`/`listProjects()` in src/lib — those summaries are shaped for
 * page rendering and `PostSummary` deliberately omits `heroImage` (only the
 * page routes read it off the raw entry, see src/pages/notes/[slug].astro).
 */
async function collectHeroSources(): Promise<HeroSource[]> {
  const reader = createReader(repoRoot, keystaticConfig);
  const sources: HeroSource[] = [];

  const postsDir = heroDirectory(
    keystaticConfig.collections.posts.schema as Record<string, unknown>,
  );
  const postSlugs = await reader.collections.posts.list();
  for (const slug of postSlugs) {
    const post = await reader.collections.posts.read(slug);
    if (post?.heroImage) {
      sources.push({
        diskPath: resolve(repoRoot, postsDir, post.heroImage),
        label: `post:${slug}`,
      });
    }
  }

  const projectsDir = heroDirectory(
    keystaticConfig.collections.projects.schema as Record<string, unknown>,
  );
  const projectSlugs = await reader.collections.projects.list();
  for (const slug of projectSlugs) {
    const project = await reader.collections.projects.read(slug);
    if (project?.heroImage) {
      sources.push({
        diskPath: resolve(repoRoot, projectsDir, project.heroImage),
        label: `project:${slug}`,
      });
    }
  }

  return sources;
}

function isFresh(srcFile: string, outFiles: string[]): boolean {
  if (!outFiles.every(existsSync)) return false;
  const srcMtime = statSync(srcFile).mtimeMs;
  return outFiles.every((f) => statSync(f).mtimeMs >= srcMtime);
}

/**
 * Encodes with `encode`, stepping down `qualities` until the result is under
 * MAX_BYTES. Warns on every step down (so a budget regression is visible in
 * CI logs, not just silently accepted) and throws if the lowest quality in
 * the ladder still overshoots — a hard-fail per the brief, not a shipped
 * over-budget file.
 */
async function encodeUnderBudget(
  makePipeline: () => Sharp,
  qualities: readonly number[],
  encode: (img: Sharp, quality: number) => Sharp,
  label: string,
): Promise<Buffer> {
  let lastSize = 0;
  for (const [i, quality] of qualities.entries()) {
    const buffer = await encode(makePipeline(), quality).toBuffer();
    lastSize = buffer.length;
    if (buffer.length <= MAX_BYTES) {
      if (i > 0) {
        console.warn(
          `gen-hero-variants: ${label} exceeded ${MAX_BYTES / 1024}KB at quality ${qualities[0]}, stepped down to quality ${quality} (${(buffer.length / 1024).toFixed(1)}KB)`,
        );
      }
      return buffer;
    }
  }
  throw new Error(
    `gen-hero-variants: ${label} could not get under the ${MAX_BYTES / 1024}KB budget even at the lowest quality in its ladder (${qualities[qualities.length - 1]}); last size ${(lastSize / 1024).toFixed(1)}KB. Source image likely needs to be replaced with something smaller/less busy.`,
  );
}

async function generateAvif(
  srcFile: string,
  width: number,
  outFile: string,
): Promise<number> {
  const buffer = await encodeUnderBudget(
    () => sharp(srcFile).resize({ width, withoutEnlargement: true }),
    AVIF_QUALITIES,
    (img, quality) => img.avif({ quality }),
    outFile,
  );
  writeFileSync(outFile, buffer);
  return buffer.length;
}

async function generateWebp(
  srcFile: string,
  width: number,
  outFile: string,
): Promise<number> {
  const buffer = await encodeUnderBudget(
    () => sharp(srcFile).resize({ width, withoutEnlargement: true }),
    WEBP_QUALITIES,
    (img, quality) => img.webp({ quality }),
    outFile,
  );
  writeFileSync(outFile, buffer);
  return buffer.length;
}

async function generatePng(
  srcFile: string,
  width: number,
  outFile: string,
): Promise<number> {
  const buffer = await encodeUnderBudget(
    () => sharp(srcFile).resize({ width, withoutEnlargement: true }),
    PNG_QUALITIES,
    (img, quality) => img.png({ quality, palette: true, effort: 10 }),
    outFile,
  );
  writeFileSync(outFile, buffer);
  return buffer.length;
}

async function processSource(source: HeroSource): Promise<void> {
  const srcFile = source.diskPath;
  if (!existsSync(srcFile)) {
    throw new Error(
      `gen-hero-variants: ${source.label} references missing file ${srcFile}`,
    );
  }

  const ext = extname(srcFile);
  const base = srcFile.slice(0, -ext.length);

  const metadata = await sharp(srcFile).metadata();
  const srcWidth = metadata.width;
  const srcHeight = metadata.height;
  if (!srcWidth || !srcHeight) {
    throw new Error(
      `gen-hero-variants: could not read dimensions for ${srcFile}`,
    );
  }

  const filteredWidths = WIDTHS.filter((w) => w <= srcWidth);
  // Guard against a hero narrower than our smallest tier (unlikely but
  // possible) — always emit at least one tier, at the source's own width,
  // rather than shipping an empty srcset.
  const widths = filteredWidths.length > 0 ? filteredWidths : [srcWidth];

  const metaFile = `${base}.gen.meta.json`;
  const outFiles = [
    ...widths.flatMap((w) => [
      `${base}.gen.${w}.avif`,
      `${base}.gen.${w}.webp`,
    ]),
    `${base}.gen.${PNG_FALLBACK_WIDTH}.png`,
    metaFile,
  ];

  if (isFresh(srcFile, outFiles)) {
    console.log(`gen-hero-variants: ${source.label} up to date, skipping`);
    return;
  }

  mkdirSync(dirname(base), { recursive: true });

  for (const w of widths) {
    const avifBytes = await generateAvif(srcFile, w, `${base}.gen.${w}.avif`);
    console.log(
      `gen-hero-variants: ${source.label} ${w}w.avif → ${(avifBytes / 1024).toFixed(1)}KB`,
    );
    const webpBytes = await generateWebp(srcFile, w, `${base}.gen.${w}.webp`);
    console.log(
      `gen-hero-variants: ${source.label} ${w}w.webp → ${(webpBytes / 1024).toFixed(1)}KB`,
    );
  }

  // PNG fallback is always named `.gen.960.png` (the naming convention),
  // but resized no larger than the source to avoid upscaling a narrow hero.
  const pngWidth = Math.min(PNG_FALLBACK_WIDTH, srcWidth);
  const pngFile = `${base}.gen.${PNG_FALLBACK_WIDTH}.png`;
  const pngBytes = await generatePng(srcFile, pngWidth, pngFile);
  console.log(
    `gen-hero-variants: ${source.label} ${PNG_FALLBACK_WIDTH}.png → ${(pngBytes / 1024).toFixed(1)}KB`,
  );

  writeFileSync(
    metaFile,
    `${JSON.stringify({ width: srcWidth, height: srcHeight, widths }, null, 2)}\n`,
  );
  console.log(`gen-hero-variants: ${source.label} wrote ${metaFile}`);
}

async function main(): Promise<void> {
  const sources = await collectHeroSources();
  if (sources.length === 0) {
    console.log(
      "gen-hero-variants: no hero images in posts or projects — nothing to do",
    );
    return;
  }
  for (const source of sources) {
    await processSource(source);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
