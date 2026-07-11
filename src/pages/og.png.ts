import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";

// Prerendered by default under `output: "static"` — emitted as a static
// /og.png at build time, so satori + resvg never reach the server function.

// Load Schibsted Grotesk WOFFs once at module init — avoids re-reading on
// each request. Console OG: night ground, amber signal, grotesk wordmark.
// Keep the Buffers as-is: `.buffer` would hand satori the whole underlying
// (possibly pooled) ArrayBuffer, not just this file's bytes.
const grotesk400 = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-400-normal.woff",
  ),
);
const grotesk700 = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff",
  ),
);

// satori's ReactNode type requires JSX compilation; we pass a compatible vnode
// object and cast via unknown since the runtime shape is correct.
type SatoriInput = Parameters<typeof satori>[0];

export const GET: APIRoute = async () => {
  const vnode = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        width: "1200px",
        height: "630px",
        background: "#16181c",
        padding: "80px 96px",
        position: "relative",
      },
      children: [
        // Wordmark
        {
          type: "div",
          props: {
            style: {
              fontFamily: "Schibsted Grotesk",
              fontSize: "92px",
              fontWeight: 700,
              color: "#e9e8e0",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: "28px",
            },
            children: "korab eland",
          },
        },
        // Positioning line
        {
          type: "div",
          props: {
            style: {
              fontFamily: "Schibsted Grotesk",
              fontSize: "26px",
              fontWeight: 400,
              color: "#a6a99c",
              lineHeight: 1.4,
            },
            children: "I turn ambiguous problems into systems that ship.",
          },
        },
        // Collar rule + domain — absolute bottom, full width
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: "52px",
              left: "96px",
              right: "96px",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              borderTop: "1px solid #2c3037",
              paddingTop: "20px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Schibsted Grotesk",
                    fontSize: "15px",
                    color: "#8a8d81",
                    letterSpacing: "0.08em",
                  },
                  children: "korabeland.com",
                },
              },
            ],
          },
        },
      ],
    },
  } as unknown as SatoriInput;

  const svg = await satori(vnode, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Schibsted Grotesk",
        data: grotesk400,
        weight: 400,
        style: "normal",
      },
      {
        name: "Schibsted Grotesk",
        data: grotesk700,
        weight: 700,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();

  // Copy into a tightly-sized Uint8Array so the body is exactly the PNG bytes.
  // `png.buffer as ArrayBuffer` would expose the underlying (possibly pooled)
  // allocation with trailing bytes — a latent footgun that only works today by
  // accident of non-pooled allocations.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
};
