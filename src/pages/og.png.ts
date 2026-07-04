import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";

// Load Schibsted Grotesk WOFFs once at module init — avoids re-reading on
// each request. Console OG: night ground, amber signal, grotesk wordmark.
const grotesk400 = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-400-normal.woff",
  ),
).buffer;
const grotesk700 = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff",
  ),
).buffer;

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
        // Status line — the availability signal
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "44px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#d99a3c",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "Schibsted Grotesk",
                    fontSize: "18px",
                    fontWeight: 400,
                    color: "#d99a3c",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  },
                  children: "open to ai · data · product roles",
                },
              },
            ],
          },
        },
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
              justifyContent: "space-between",
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
                  children: "operator · 13 yrs · builds with ai",
                },
              },
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

  return new Response(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
};
