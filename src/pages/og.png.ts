import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";

// Load Fraunces WOFF once at module init — avoids re-reading on each request.
const frauncesFontData = readFileSync(
  resolve(
    process.cwd(),
    "node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
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
        alignItems: "center",
        justifyContent: "center",
        width: "1200px",
        height: "630px",
        background: "#1f2a2a",
        padding: "80px",
        position: "relative",
      },
      children: [
        // Compass mark — circle with inner dot, evoking the trail map pin
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              border: "1.5px solid #4f6f55",
              marginBottom: "40px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#4f6f55",
                  },
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
              fontFamily: "Fraunces",
              fontSize: "88px",
              fontWeight: 400,
              color: "#f6f3ec",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: "28px",
              textAlign: "center",
            },
            children: "korabeland",
          },
        },
        // Rule
        {
          type: "div",
          props: {
            style: {
              width: "48px",
              height: "1px",
              background: "#4f6f55",
              marginBottom: "28px",
            },
          },
        },
        // Subtitle
        {
          type: "div",
          props: {
            style: {
              fontFamily: "Fraunces",
              fontSize: "22px",
              fontWeight: 400,
              color: "#7f8887",
              letterSpacing: "0.08em",
              textAlign: "center",
            },
            children: "builder · operator · writer",
          },
        },
        // Domain label — absolute bottom-right
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: "44px",
              right: "64px",
              fontFamily: "Fraunces",
              fontSize: "14px",
              color: "#4d5757",
              letterSpacing: "0.04em",
            },
            children: "korabeland.com",
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
        name: "Fraunces",
        data: frauncesFontData,
        weight: 400,
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
