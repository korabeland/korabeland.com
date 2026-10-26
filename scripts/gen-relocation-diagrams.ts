#!/usr/bin/env tsx
// Emit the responsive day/night diagram images from committed source PNGs.
// Generated files follow the site's ignored `.gen.*` convention and are
// rebuilt before dev and production builds.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const repoRoot = resolve(process.cwd());
const sourceDir = resolve(repoRoot, "src/assets/relocation-playbook");
const outputDir = resolve(repoRoot, "public/lab/relocation-playbook/diagrams");
const diagrams = [
  "system-overview",
  "ripple-effects",
  "first-system",
  "weekly-agenda",
  "redesigned-system",
] as const;
const shifts = ["day", "night"] as const;
const widths = [680, 1360] as const;
const maxBytes = 200 * 1024;

async function encode(
  source: string,
  width: number,
  format: "avif" | "webp",
): Promise<Buffer> {
  const qualities =
    format === "avif" ? [50, 42, 34, 26, 20] : [75, 65, 55, 45, 35];
  for (const quality of qualities) {
    const pipeline = sharp(source).resize({ width, withoutEnlargement: true });
    const bytes =
      format === "avif"
        ? await pipeline.avif({ quality, effort: 2 }).toBuffer()
        : await pipeline.webp({ quality, effort: 2 }).toBuffer();
    if (bytes.byteLength <= maxBytes) return bytes;
  }
  throw new Error(
    `gen-relocation-diagrams: ${source} exceeds ${maxBytes} bytes at ${width}w ${format}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(outputDir, { recursive: true });
  for (const diagram of diagrams) {
    for (const shift of shifts) {
      const basename = `${diagram}-${shift}`;
      const source = resolve(sourceDir, `${basename}.png`);
      for (const width of widths) {
        for (const format of ["avif", "webp"] as const) {
          const bytes = await encode(source, width, format);
          const output = resolve(
            outputDir,
            `${basename}.gen.${width}.${format}`,
          );
          writeFileSync(output, bytes);
          console.log(
            `gen-relocation-diagrams: ${basename} ${width}w.${format} ${(bytes.byteLength / 1024).toFixed(1)}KB`,
          );
        }
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
