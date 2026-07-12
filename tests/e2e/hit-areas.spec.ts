import { expect, test } from "@playwright/test";

// The chrome controls get 44px tap targets via invisible centred ::after pads
// (global.css "Expanded hit areas"). Two invariants keep that mechanism safe:
//
// 1. A tap just outside a control's visible box still activates that control
//    (the pad works).
// 2. Adjacent controls' pads never overlap — an overlapping pad would let a
//    tap near one control activate its neighbour. Touching edges are fine:
//    the pads then split the gap at its midpoint.
//
// Pad geometry mirrors the CSS: width max(100%, minW), height max(100%, 44),
// centred on the control's box.

type PadRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  label: string;
};

function padOverlaps(selector: string, minWidth: number) {
  return `(() => {
    const pads = [...document.querySelectorAll(${JSON.stringify(selector)})]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const w = Math.max(r.width, ${minWidth});
        const h = Math.max(r.height, 44);
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return {
          left: cx - w / 2,
          right: cx + w / 2,
          top: cy - h / 2,
          bottom: cy + h / 2,
          label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 12),
        };
      });
    const overlaps = [];
    for (let i = 0; i < pads.length - 1; i++) {
      const a = pads[i];
      const b = pads[i + 1];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      // Sub-pixel touching is allowed; a real overlap steals taps.
      if (ox > 0.5 && oy > 0.5) overlaps.push(a.label + "|" + b.label + ":" + ox.toFixed(1));
    }
    return overlaps;
  })()`;
}

for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`chrome hit-area pads do not overlap at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator("main#main").waitFor({ state: "visible" });

    for (const [selector, minWidth] of [
      [".chrome-nav a", 44],
      [".site-footer a", 44],
      [".hero-social-link", 26],
    ] as const) {
      const overlaps = (await page.evaluate(
        padOverlaps(selector, minWidth),
      )) as string[];
      expect(overlaps, `${selector} pads overlap`).toEqual([]);
    }
  });
}

for (const viewport of [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`a tap above a nav link still activates it at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.locator("main#main").waitFor({ state: "visible" });

    const hit = await page.evaluate(() => {
      const link = document.querySelector(".chrome-nav a");
      if (!link) return "no-link";
      const r = link.getBoundingClientRect();
      const above = document.elementFromPoint(r.left + r.width / 2, r.top - 8);
      return above === link || link.contains(above) ? "hit" : "miss";
    });
    expect(hit).toBe("hit");
  });
}
