import { expect, test } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

const CALL = "/work/call-tiering";
const LEAD = "/work/lead-scoring";
const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const SHIFTS = ["night", "day"] as const;

const shiftState = (shift: (typeof SHIFTS)[number]) => ({
  cookies: [],
  origins: [
    { origin: ORIGIN, localStorage: [{ name: "korab-shift", value: shift }] },
  ],
});

for (const shift of SHIFTS) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name}, ${shift} shift`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        storageState: shiftState(shift),
      });

      test("both case studies fit and label their illustrative figures", async ({
        page,
      }) => {
        for (const route of [CALL, LEAD]) {
          await page.goto(route);
          await expect(page.locator("html")).toHaveAttribute(
            "data-time",
            shift,
          );
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          expect(overflow, route).toBeLessThanOrEqual(0);
          const illustrative = page.locator(".xf-chip");
          await expect(illustrative).toHaveCount(route === CALL ? 2 : 1);
          await expect(illustrative).toHaveText(
            Array.from(
              { length: route === CALL ? 2 : 1 },
              () => "Illustrative",
            ),
          );
        }

        await page.goto(CALL);
        await expect(page.locator("h1.head-title")).toHaveText(
          "From Coverage to Intent-based Dialling",
        );
        await expect(page.locator(".head-meta .statuschip")).toHaveText(
          "Shipped",
        );
        await page.goto(LEAD);
        await expect(page.locator("h1.head-title")).toHaveText(
          "Precision Dialling via Predictive Modelling",
        );
        await expect(page.locator(".head-meta .statuschip")).toHaveText(
          "Designed and handed over, August 2026",
        );
      });
    });
  }
}

test("the matrix sorts a lead by both answers with keyboard controls", async ({
  page,
}) => {
  await page.goto(CALL);
  const figure = page.locator("#figure-tier-matrix");
  const result = figure.locator("[data-pm-say]");
  await expect(result).toContainText("Tier 1. Call first.");

  const timeframe = figure.getByRole("radio", { name: "As soon as possible" });
  await timeframe.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(
    figure.getByRole("radio", { name: "Not sure yet" }),
  ).toBeChecked();
  const intent = figure.getByRole("radio", { name: "Ready to enroll" });
  await intent.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(result).toContainText(
    "Not sure yet + Just browsing: Tier 3. Call last.",
  );

  await expect(
    figure.getByRole("group", {
      name: "Reason for enquiring: how ready are you to enroll?",
    }),
  ).toBeVisible();
});

test("the effort switch keeps the rounded result and conversion context", async ({
  page,
}) => {
  await page.goto(CALL);
  const figure = page.locator("#figure-call-effort");
  const share = figure.locator(
    ".ss-legend-row[data-focus] .ss-legend-value span:visible",
  );
  await expect(share).toHaveText("about 30%");
  await figure.getByRole("radio", { name: /After/ }).check();
  await expect(share).toHaveText("less than 1%");
  await expect(figure.locator(".ss-verdict:visible")).toContainText(
    "conversion held",
  );
  await expect(figure.locator(".rp")).toContainText("8x");
});

test("the decile cutoff explores a method without implying a result", async ({
  page,
}) => {
  await page.goto(LEAD);
  const figure = page.locator("#figure-cutoff");
  const slider = figure.getByRole("slider");
  const readout = figure.locator(".cd-read");
  await expect(readout).toContainText(
    "All 10 deciles remain in the call queue.",
  );
  await expect(readout).toContainText(
    "All ten deciles remain in the call queue.",
  );

  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(readout).toContainText(
    "The bottom decile sits below the cutoff.",
  );
  await expect(readout).toContainText("This illustrative position");
  await expect(figure.locator(".cd-bar[data-cut]")).toHaveCount(1);
  await expect(readout).toContainText(
    "does not predict how many calls can safely stop",
  );

  for (let step = 0; step < 9; step += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(readout).toContainText("No calls go to any of the 10 deciles.");
  await expect(readout).toContainText("This is not a recommendation");
});

test("the two case studies link in both directions and the work listing features both", async ({
  page,
}) => {
  await page.goto(CALL);
  await page.getByRole("link", { name: "lead scoring begins" }).click();
  await expect(page).toHaveURL(LEAD);
  await page.getByRole("link", { name: "Call Tiering" }).first().click();
  await expect(page).toHaveURL(CALL);

  await page.goto("/work");
  await expect(page.locator(".fs")).toContainText(
    "From Coverage to Intent-based Dialling",
  );
  await expect(
    page.locator('.ledger a[href="/work/call-tiering"]'),
  ).toBeVisible();
  await expect(
    page.locator('.ledger a[href="/work/lead-scoring"]'),
  ).toBeVisible();
});

test("keyboard controls meet the touch target size", async ({ page }) => {
  for (const [route, selectors] of [
    [CALL, ["#figure-tier-matrix .pm-opt", "#figure-call-effort .ss-state"]],
    [LEAD, ["#figure-cutoff .cd-control input"]],
  ] as const) {
    await page.goto(route);
    for (const selector of selectors) {
      for (const target of await page.locator(selector).all()) {
        const box = await target.boundingBox();
        expect(box?.height, `${route} ${selector}`).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test.describe("with scripts off", () => {
  test.use({ javaScriptEnabled: false });

  test("the static figures still carry the point on both pages", async ({
    page,
  }) => {
    await page.goto(CALL);
    const matrix = page.locator("#figure-tier-matrix");
    await expect(matrix.locator("table .pm-cell")).toHaveCount(12);
    await expect(matrix.getByRole("rowheader")).toHaveCount(4);
    await expect(matrix.locator("[data-pm-controls]")).toBeHidden();
    await expect(matrix.locator(".pm-legend")).toContainText("Call first");

    const effort = page.locator("#figure-call-effort");
    await effort.getByRole("radio", { name: /After/ }).check();
    await expect(
      effort.locator(
        ".ss-legend-row[data-focus] .ss-legend-value span:visible",
      ),
    ).toHaveText("less than 1%");

    await page.goto(LEAD);
    const cutoff = page.locator("#figure-cutoff");
    await expect(cutoff.locator(".cd-read")).toContainText(
      "All 10 deciles remain in the call queue.",
    );
    await expect(cutoff.getByRole("slider")).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Designed, documented, and handed over",
      }),
    ).toBeVisible();
  });
});
