#!/usr/bin/env tsx
// Generates width-tiered AVIF/WebP/(PNG|JPEG) variants for images the site's
// imageService cascade can't optimize: Keystatic hero images (posts +
// projects, under `public/`) and the two illustrated portraits (under
// `src/assets/`). `imageService: true` (see astro.config.mjs) swaps Astro's
// bundled sharp for Vercel's native image optimizer — which ignores
// requested widths/formats for BOTH `public/` paths and astro:assets
// `<Image>` sources alike (confirmed by the mobile-LCP audit: the portrait
// shipped at full 1200w via `/_vercel/image` regardless of its `widths`
// prop). This script does the resizing itself, ahead of build, the same way
// the favicons already bypass the pipeline (see BaseLayout.astro).
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

const HERO_WIDTHS = [640, 960, 1280] as const;
const HERO_PNG_FALLBACK_WIDTH = 960;

const PORTRAIT_WIDTHS = [360, 720, 1040] as const;
const PORTRAIT_JPEG_FALLBACK_WIDTH = 720;
const PORTRAIT_OUT_DIR = "public/portrait";

const MAX_BYTES = 200 * 1024;

// Quality ladders to step down through when the default quality overshoots
// the 200KB budget. AVIF compresses hardest, so it can start low; PNG needs
// palette quantization (libimagequant) to hit budget on photographic content;
// JPEG uses mozjpeg for the same reason.
const AVIF_QUALITIES = [50, 42, 34, 26, 20];
const WEBP_QUALITIES = [75, 65, 55, 45, 35];
const PNG_QUALITIES = [90, 80, 70, 60, 50, 40];
const JPEG_QUALITIES = [80, 70, 60, 50, 40, 30];

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

async function generateJpeg(
  srcFile: string,
  width: number,
  outFile: string,
): Promise<number> {
  const buffer = await encodeUnderBudget(
    () => sharp(srcFile).resize({ width, withoutEnlargement: true }),
    JPEG_QUALITIES,
    (img, quality) => img.jpeg({ quality, mozjpeg: true }),
    outFile,
  );
  writeFileSync(outFile, buffer);
  return buffer.length;
}

interface VariantJob {
  /** Absolute path to the source file. */
  srcFile: string;
  /** Absolute output path prefix, without extension — e.g. ".../public/portrait/portrait-illustrated". */
  outBase: string;
  /** Human label for logging, e.g. "post:system-designer-personal-os" or "portrait:night". */
  label: string;
  widths: readonly number[];
  fallback: { format: "png" | "jpeg"; width: number };
}

/**
 * Shared core behind both the Keystatic hero pass and the static-portrait
 * pass: read source dimensions, pick the width tiers that fit, skip if the
 * output is already fresh, emit AVIF/WebP per tier plus one fallback
 * (PNG for heroes, JPEG for the photographic portraits), and write the
 * sibling meta.json the components read at build time.
 */
async function generateVariantSet(job: VariantJob): Promise<void> {
  if (!existsSync(job.srcFile)) {
    throw new Error(
      `gen-hero-variants: ${job.label} references missing file ${job.srcFile}`,
    );
  }

  const metadata = await sharp(job.srcFile).metadata();
  const srcWidth = metadata.width;
  const srcHeight = metadata.height;
  if (!srcWidth || !srcHeight) {
    throw new Error(
      `gen-hero-variants: could not read dimensions for ${job.srcFile}`,
    );
  }

  const filteredWidths = job.widths.filter((w) => w <= srcWidth);
  // Guard against a source narrower than our smallest tier (unlikely but
  // possible) — always emit at least one tier, at the source's own width,
  // rather than shipping an empty srcset.
  const widths = filteredWidths.length > 0 ? filteredWidths : [srcWidth];

  const fallbackExt = job.fallback.format === "png" ? "png" : "jpg";
  const fallbackFile = `${job.outBase}.gen.${job.fallback.width}.${fallbackExt}`;
  const metaFile = `${job.outBase}.gen.meta.json`;
  const outFiles = [
    ...widths.flatMap((w) => [
      `${job.outBase}.gen.${w}.avif`,
      `${job.outBase}.gen.${w}.webp`,
    ]),
    fallbackFile,
    metaFile,
  ];

  if (isFresh(job.srcFile, outFiles)) {
    console.log(`gen-hero-variants: ${job.label} up to date, skipping`);
    return;
  }

  mkdirSync(dirname(job.outBase), { recursive: true });

  for (const w of widths) {
    const avifBytes = await generateAvif(
      job.srcFile,
      w,
      `${job.outBase}.gen.${w}.avif`,
    );
    console.log(
      `gen-hero-variants: ${job.label} ${w}w.avif → ${(avifBytes / 1024).toFixed(1)}KB`,
    );
    const webpBytes = await generateWebp(
      job.srcFile,
      w,
      `${job.outBase}.gen.${w}.webp`,
    );
    console.log(
      `gen-hero-variants: ${job.label} ${w}w.webp → ${(webpBytes / 1024).toFixed(1)}KB`,
    );
  }

  // The fallback is always named `.gen.<fallback.width>.<ext>` (the naming
  // convention), but resized no larger than the source to avoid upscaling.
  const fallbackWidth = Math.min(job.fallback.width, srcWidth);
  const fallbackBytes =
    job.fallback.format === "png"
      ? await generatePng(job.srcFile, fallbackWidth, fallbackFile)
      : await generateJpeg(job.srcFile, fallbackWidth, fallbackFile);
  console.log(
    `gen-hero-variants: ${job.label} ${job.fallback.width}.${fallbackExt} → ${(fallbackBytes / 1024).toFixed(1)}KB`,
  );

  writeFileSync(
    metaFile,
    `${JSON.stringify({ width: srcWidth, height: srcHeight, widths }, null, 2)}\n`,
  );
  console.log(`gen-hero-variants: ${job.label} wrote ${metaFile}`);
}

async function processHeroSource(source: HeroSource): Promise<void> {
  const ext = extname(source.diskPath);
  const outBase = source.diskPath.slice(0, -ext.length);
  await generateVariantSet({
    srcFile: source.diskPath,
    outBase,
    label: source.label,
    widths: HERO_WIDTHS,
    fallback: { format: "png", width: HERO_PNG_FALLBACK_WIDTH },
  });
}

interface PortraitSource {
  srcFile: string;
  /** Output filename stem, e.g. "portrait-illustrated". */
  basename: string;
  label: string;
}

// The two illustrated-portrait sources (src/assets/, imported by
// Portrait/index.astro's predecessor via astro:assets — dropped in favour of
// these static variants because imageService: true ignores requested
// widths/formats for astro:assets sources exactly like it does public/
// paths). Not Keystatic-managed, so there's no collection to enumerate these
// from — hardcoded, same as the favicon regeneration note in BaseLayout.astro.
const PORTRAIT_SOURCES: PortraitSource[] = [
  {
    srcFile: resolve(repoRoot, "src/assets/portrait-illustrated.jpg"),
    basename: "portrait-illustrated",
    label: "portrait:night",
  },
  {
    srcFile: resolve(repoRoot, "src/assets/portrait-illustrated-day.jpg"),
    basename: "portrait-illustrated-day",
    label: "portrait:day",
  },
];

async function processPortraitSources(): Promise<void> {
  const outDir = resolve(repoRoot, PORTRAIT_OUT_DIR);
  for (const portrait of PORTRAIT_SOURCES) {
    await generateVariantSet({
      srcFile: portrait.srcFile,
      outBase: resolve(outDir, portrait.basename),
      label: portrait.label,
      widths: PORTRAIT_WIDTHS,
      fallback: { format: "jpeg", width: PORTRAIT_JPEG_FALLBACK_WIDTH },
    });
  }
}

async function main(): Promise<void> {
  const sources = await collectHeroSources();
  if (sources.length === 0) {
    console.log(
      "gen-hero-variants: no hero images in posts or projects — skipping the Keystatic pass",
    );
  } else {
    for (const source of sources) {
      await processHeroSource(source);
    }
  }
  await processPortraitSources();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
