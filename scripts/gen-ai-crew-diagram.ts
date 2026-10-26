#!/usr/bin/env tsx
// Emit responsive day/night variants from the committed AI crew artwork.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const repoRoot = resolve(process.cwd());
const outputDir = resolve(repoRoot, "public/diagrams");
const shifts = ["day", "dark"] as const;
const layouts = [
  { suffix: "", widths: [680, 1360] as const },
  { suffix: "-mobile", widths: [375, 750] as const },
] as const;
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
        ? await pipeline.avif({ quality, effort: 6 }).toBuffer()
        : await pipeline.webp({ quality, effort: 6 }).toBuffer();
    if (bytes.byteLength <= maxBytes) return bytes;
  }
  throw new Error(
    `gen-ai-crew-diagram: ${source} exceeds ${maxBytes} bytes at ${width}w ${format}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(outputDir, { recursive: true });
  for (const shift of shifts) {
    for (const layout of layouts) {
      const source = resolve(
        repoRoot,
        `src/assets/ai-crew-flow-${shift}${layout.suffix}.png`,
      );
      for (const width of layout.widths) {
        for (const format of ["avif", "webp"] as const) {
          const bytes = await encode(source, width, format);
          writeFileSync(
            resolve(
              outputDir,
              `ai-crew-flow-${shift}${layout.suffix}.gen.${width}.${format}`,
            ),
            bytes,
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
