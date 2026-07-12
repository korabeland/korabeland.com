#!/usr/bin/env tsx
// Generates the portrait gaze rig's per-eye layer set (U3). Unlike
// gen-hero-variants (responsive re-encoding of whole images), this cuts and
// retouches compositing layers from the pristine src/assets portraits:
//
//   occluder    base pixels, lid aperture punched to alpha (lids clip the iris)
//   highlight   catchlight specular, environment-fixed (two strategies, below)
//   sprite      iris+pupil disc, catchlights removed — the only layer that moves
//   underlay    base with the iris disc filled by diffusion-inpainted sclera
//
// Geometry comes from RIG_MANIFEST in src/lib/portrait-gaze.ts (the SSOT); a
// hash of that geometry is stamped into the meta JSON so a staleness test can
// fail CI when assets trail the SSOT (AE7's spirit). Outputs are gitignored
// (`public/**/*.gen.*`) and regenerated on demand.
//
// Highlight strategy (judged live at the U4 proof): `all` fixes every iris
// sparkle onto the highlight layer (physically correct, but the iris detail
// separates as the sprite slides); `main` fixes only the primary catchlight
// near the pupil and lets the fine sparkle ride with the sprite. Both are
// emitted so the proof can toggle; U3 finalises to the chosen one afterwards.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import {
  type EyeRig,
  PORTRAIT_VARIANTS,
  RIG,
  RIG_MANIFEST,
} from "../src/lib/portrait-gaze";
import {
  RIG_BOX as BOX,
  RIG_LAYERS as LAYERS,
  rigGeometryHash,
} from "./rig-manifest-hash";

const repoRoot = resolve(process.cwd());
const OUT_DIR = resolve(repoRoot, "public/portrait/rig");
const MAX_LAYER_BYTES = 24 * 1024; // per-layer hard ceiling (mirrors gen-hero)

// Highlight strategy is settled: Korab picked "main catchlight only" live at the
// U4 proof (2026-07-12) — only the primary catchlight near the pupil is fixed on
// the highlight layer; the finer iris sparkle rides with the moving sprite.
// (Layer names live in ./rig-manifest-hash so the tests share them.)
/** Radius around the iris centre inside which specular counts as the "main"
 *  catchlight (fixed); brighter pixels outside it stay on the sprite. */
const MAIN_CATCHLIGHT_R = 0.55;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lum(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Harmonic fill: masked pixels relax to the mean of their 4 neighbours over
// `iters` sweeps, pulling surrounding sclera/lid colour into the iris hole.
function diffusionInpaint(
  rgb: Float32Array,
  W: number,
  H: number,
  mask: Uint8Array,
  iters: number,
): Float32Array {
  let cur = rgb.slice();
  let next = rgb.slice();
  for (let it = 0; it < iters; it++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!mask[i]) continue;
        for (let c = 0; c < 3; c++) {
          let s = 0;
          let n = 0;
          if (x > 0) {
            s += cur[(i - 1) * 3 + c];
            n++;
          }
          if (x < W - 1) {
            s += cur[(i + 1) * 3 + c];
            n++;
          }
          if (y > 0) {
            s += cur[(i - W) * 3 + c];
            n++;
          }
          if (y < H - 1) {
            s += cur[(i + W) * 3 + c];
            n++;
          }
          next[i * 3 + c] = s / n;
        }
      }
    }
    [cur, next] = [next, cur];
  }
  return cur;
}

interface Layers {
  underlay: Buffer; // RGBA box
  occluder: Buffer;
  sprite: Buffer;
  highlight: Buffer;
  restParity: number; // mean |Δ| per channel at rest, 0-255
}

async function cutEye(
  src: string,
  W: number,
  rig: EyeRig,
): Promise<{ box: number; ox: number; oy: number; layers: Layers }> {
  const half = Math.round((BOX / 2) * W);
  const box = half * 2;
  const ox = Math.round(rig.cx * W - half);
  const oy = Math.round(rig.cy * W - half);
  const { data } = await sharp(src)
    .extract({ left: ox, top: oy, width: box, height: box })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const N = box * box;
  const base = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    base[i * 3] = data[i * 3];
    base[i * 3 + 1] = data[i * 3 + 1];
    base[i * 3 + 2] = data[i * 3 + 2];
  }
  const lcx = rig.cx * W - ox;
  const lcy = rig.cy * W - oy;
  const irisPx = rig.irisR * W;
  const apx = rig.aperture.cx * W - ox;
  const apy = rig.aperture.cy * W - oy;
  const apRx = rig.aperture.rx * W;
  const apRy = rig.aperture.ry * W;

  // masks + mean iris luminance (for the specular threshold)
  const irisAlpha = new Float32Array(N);
  const irisFill = new Uint8Array(N);
  const apAlpha = new Float32Array(N);
  let lumSum = 0,
    lumN = 0;
  for (let y = 0; y < box; y++) {
    for (let x = 0; x < box; x++) {
      const i = y * box + x;
      const d = Math.hypot(x - lcx, y - lcy);
      if (d < irisPx) {
        lumSum += lum(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        lumN++;
      }
    }
  }
  const meanLum = lumSum / lumN;
  // catch = only the primary catchlight near the iris centre (the "main"
  // strategy); the finer sparkle outside `mainR` is left on the sprite.
  const catch_ = new Float32Array(N);
  const mainR = irisPx * MAIN_CATCHLIGHT_R;
  for (let y = 0; y < box; y++) {
    for (let x = 0; x < box; x++) {
      const i = y * box + x;
      const d = Math.hypot(x - lcx, y - lcy);
      irisAlpha[i] = 1 - smoothstep(irisPx - 2, irisPx + 0.5, d);
      if (d < irisPx + 1) irisFill[i] = 1;
      const ed = Math.hypot((x - apx) / apRx, (y - apy) / apRy);
      apAlpha[i] = 1 - smoothstep(0.92, 1.02, ed);
      if (d < mainR) {
        const l = lum(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
        catch_[i] = smoothstep(meanLum + 55, meanLum + 95, l);
      }
    }
  }

  const underlayRGB = diffusionInpaint(base, box, box, irisFill, 220);
  const fill = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (catch_[i] > 0.25) fill[i] = 1;
  // sprite RGB = iris with the main catchlight inpainted out (so it doesn't
  // double with the fixed highlight layer); fine sparkle stays put.
  const spriteRGB = diffusionInpaint(base, box, box, fill, 60);

  // assemble RGBA layer buffers
  const mk = (fn: (i: number) => [number, number, number, number]): Buffer => {
    const b = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
      const [r, g, bl, a] = fn(i);
      b[i * 4] = r;
      b[i * 4 + 1] = g;
      b[i * 4 + 2] = bl;
      b[i * 4 + 3] = a;
    }
    return b;
  };
  const underlay = mk((i) => [
    underlayRGB[i * 3],
    underlayRGB[i * 3 + 1],
    underlayRGB[i * 3 + 2],
    255,
  ]);
  const occluder = mk((i) => [
    base[i * 3],
    base[i * 3 + 1],
    base[i * 3 + 2],
    Math.round((1 - apAlpha[i]) * 255),
  ]);
  const sprite = mk((i) => [
    spriteRGB[i * 3],
    spriteRGB[i * 3 + 1],
    spriteRGB[i * 3 + 2],
    Math.round(irisAlpha[i] * 255),
  ]);
  const highlight = mk((i) => [
    base[i * 3],
    base[i * 3 + 1],
    base[i * 3 + 2],
    Math.round(catch_[i] * 255),
  ]);

  // rest-parity: composite the stack at rest over base, diff vs base.
  let sum = 0;
  for (let i = 0; i < N; i++) {
    let r = underlay[i * 4],
      g = underlay[i * 4 + 1],
      bl = underlay[i * 4 + 2];
    const sa = irisAlpha[i];
    r = r * (1 - sa) + spriteRGB[i * 3] * sa;
    g = g * (1 - sa) + spriteRGB[i * 3 + 1] * sa;
    bl = bl * (1 - sa) + spriteRGB[i * 3 + 2] * sa;
    const ca = catch_[i];
    r = r * (1 - ca) + base[i * 3] * ca;
    g = g * (1 - ca) + base[i * 3 + 1] * ca;
    bl = bl * (1 - ca) + base[i * 3 + 2] * ca;
    const oa = 1 - apAlpha[i];
    r = r * (1 - oa) + base[i * 3] * oa;
    g = g * (1 - oa) + base[i * 3 + 1] * oa;
    bl = bl * (1 - oa) + base[i * 3 + 2] * oa;
    sum +=
      (Math.abs(r - base[i * 3]) +
        Math.abs(g - base[i * 3 + 1]) +
        Math.abs(bl - base[i * 3 + 2])) /
      3;
  }
  return {
    box,
    ox,
    oy,
    layers: { underlay, occluder, sprite, highlight, restParity: sum / N },
  };
}

async function writeWebp(
  rgba: Buffer,
  box: number,
  file: string,
): Promise<number> {
  const buf = await sharp(rgba, {
    raw: { width: box, height: box, channels: 4 },
  })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toBuffer();
  if (buf.length > MAX_LAYER_BYTES) {
    throw new Error(
      `gen-eye-rig: ${file} is ${(buf.length / 1024).toFixed(1)}KB, over the ${MAX_LAYER_BYTES / 1024}KB per-layer ceiling.`,
    );
  }
  writeFileSync(file, buf);
  return buf.length;
}

function isFresh(src: string, outs: string[]): boolean {
  if (!outs.every(existsSync)) return false;
  const srcM = statSync(src).mtimeMs;
  return outs.every((f) => statSync(f).mtimeMs >= srcM);
}

async function processVariant(basename: string): Promise<number> {
  const src = resolve(repoRoot, "src/assets", `${basename}.jpg`);
  if (!existsSync(src)) throw new Error(`gen-eye-rig: missing source ${src}`);
  const meta = await sharp(src).metadata();
  const W = meta.width;
  if (!W) throw new Error(`gen-eye-rig: no width for ${src}`);
  const rig = RIG_MANIFEST[basename];
  const metaPath = resolve(OUT_DIR, `${basename}.rig.gen.meta.json`);

  const eyeFiles = (eye: string) =>
    LAYERS.map((l) => resolve(OUT_DIR, `${basename}.${eye}.${l}.gen.webp`));
  const allOuts = [...eyeFiles("left"), ...eyeFiles("right"), metaPath];
  const hash = rigGeometryHash(basename);
  if (isFresh(src, allOuts) && existsSync(metaPath)) {
    const prev = JSON.parse(readFileSync(metaPath, "utf8"));
    if (prev.geometryHash === hash) {
      console.log(`gen-eye-rig: ${basename} up to date, skipping`);
      return 0;
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const bytes: Record<string, number> = {};
  const eyesMeta: Record<string, unknown> = {};
  let total = 0;
  for (const [eye, r] of [
    ["left", rig.left],
    ["right", rig.right],
  ] as const) {
    const { box, ox, oy, layers } = await cutEye(src, W, r);
    const bufs: Record<(typeof LAYERS)[number], Buffer> = {
      underlay: layers.underlay,
      occluder: layers.occluder,
      sprite: layers.sprite,
      highlight: layers.highlight,
    };
    for (const l of LAYERS) {
      const name = `${basename}.${eye}.${l}.gen.webp`;
      const n = await writeWebp(bufs[l], box, resolve(OUT_DIR, name));
      bytes[name] = n;
      total += n;
    }
    eyesMeta[eye] = {
      // box position over the portrait, fraction of image width
      boxLeft: ox / W,
      boxTop: oy / W,
      boxSize: box / W,
      // iris centre within the box, fraction of box (sprite pivot)
      irisCxInBox: (r.cx * W - ox) / box,
      irisCyInBox: (r.cy * W - oy) / box,
      irisR: r.irisR,
      restParity: Number(layers.restParity.toFixed(3)),
    };
    console.log(
      `gen-eye-rig: ${basename} ${eye} rest-parity mean|Δ|=${layers.restParity.toFixed(2)}`,
    );
  }

  writeFileSync(
    metaPath,
    `${JSON.stringify(
      {
        geometryHash: hash,
        box: BOX,
        layers: LAYERS,
        travelCeiling: RIG.travelCeiling,
        eyes: eyesMeta,
        bytes,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `gen-eye-rig: ${basename} wrote ${LAYERS.length * 2} layers, ${(total / 1024).toFixed(1)}KB total`,
  );
  return total;
}

async function main(): Promise<void> {
  let total = 0;
  for (const v of PORTRAIT_VARIANTS) total += await processVariant(v.basename);
  console.log(
    `gen-eye-rig: full rig set = ${(total / 1024).toFixed(1)}KB across ${PORTRAIT_VARIANTS.length} variants`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
