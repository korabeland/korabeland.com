import { expect, test, type Page } from "@playwright/test";
import { ORIGIN } from "../helpers/port";

const CALL = "/work/call-tiering";
const LEAD = "/work/lead-scoring";
const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
] as const;
const SHIFTS = ["night", "day"] as const;
const SOURCE_NUMBER_TOKENS = new Set([
  "0.8", "1", "2", "3", "6", "6.7", "7", "8", "8.2", "10", "13", "14",
  "16", "30", "290", "600", "2025", "2026",
]);

const shiftState = (shift: (typeof SHIFTS)[number]) => ({
  cookies: [],
  origins: [
    { origin: ORIGIN, localStorage: [{ name: "korab-shift", value: shift }] },
  ],
});

async function expectRenderedCopy(page: Page, expectedKept?: number) {
  const rendered = await page.evaluate(() => {
    const selectors = [
      ".head-title",
      ".head-subtitle",
      ".fact-value",
      ".prose",
      ".outcome .metric-details",
    ];
    const roots = selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)),
    );
    const copyParts = roots.map((root) => {
        const clone = root.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll(".next-row, .xf-meta, .cr-n")
          .forEach((el) => el.remove());
        if (clone.matches(".metric-details")) {
          clone.querySelector(".sr-only")?.remove();
        }
        const numberCopy = clone.cloneNode(true) as HTMLElement;
        numberCopy.querySelector(".cd-read-main")?.remove();
        return {
          text: clone.textContent ?? "",
          numbers: numberCopy.textContent ?? "",
        };
      });
    return {
      text: copyParts.map((part) => part.text).join(" "),
      numbers: copyParts.map((part) => part.numbers).join(" "),
      dial: document.querySelector(".cd-read-main")?.textContent ?? null,
    };
  });
  expect(rendered.text).not.toMatch(/[—–]|\s-\s/);
  const numbers = rendered.numbers.match(/\d+(?:\.\d+)?/g) ?? [];
  expect(numbers.filter((number) => !SOURCE_NUMBER_TOKENS.has(number))).toEqual(
    [],
  );
  if (expectedKept !== undefined) {
    const cut = 10 - expectedKept;
    const expectedReadout =
      cut === 0
        ? "All 10 deciles remain in the call queue."
        : cut === 10
          ? "No calls go to any of the 10 deciles."
          : cut === 1
            ? "The bottom decile sits below the cutoff."
            : `Bottom ${cut} deciles sit below the cutoff.`;
    expect(rendered.dial).toBe(expectedReadout);
  }
}

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
          for (const metric of await page
            .locator(".outcome .metric-details")
            .all()) {
            const label = await metric.locator(".metric-label").boundingBox();
            const value = await metric
              .locator(".metric-value-group")
              .boundingBox();
            expect(label).not.toBeNull();
            expect(value).not.toBeNull();
            if (!label || !value) continue;
            const overlaps =
              label.x < value.x + value.width &&
              label.x + label.width > value.x &&
              label.y < value.y + value.height &&
              label.y + label.height > value.y;
            expect(overlaps, `${route} metric label/value`).toBe(false);
            expect(value.x + value.width).toBeLessThanOrEqual(viewport.width);
          }
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

  const rowChoices = figure.locator('[data-pm-axis="row"] input');
  const columnChoices = figure.locator('[data-pm-axis="col"] input');
  for (let row = 0; row < 4; row += 1) {
    await rowChoices.nth(row).check();
    for (let column = 0; column < 3; column += 1) {
      await columnChoices.nth(column).check();
      await expectRenderedCopy(page);
    }
  }
});

test("rendered flagship copy keeps supported numbers and clean punctuation", async ({
  page,
}) => {
  for (const route of [CALL, LEAD]) {
    await page.goto(route);
    await expectRenderedCopy(page);
  }

  await page.goto(CALL);
  await expect(page.locator(".head-title")).toHaveText(
    "From Coverage to Intent-based Dialling",
  );
  const callCopy = page.locator(".prose");
  for (const fact of [
    "up to four calls over 14 days",
    "two calls over 7 days",
    "one call on day 1",
    "Tier 1 leads applied at eight times Tier 3's rate",
    "Tier 1 converted at 6.7%, compared with 0.8% for Tier 3",
    "with no revenue lost",
    "8.2%",
    "No headcount was added",
    "Weekly call output later fell 16% while lead volume grew 8%",
  ]) {
    await expect(callCopy).toContainText(fact);
  }
  for (const metric of await page.locator(".outcome .metric-details").all()) {
    await metric.locator("summary").click();
    await expect(metric.locator(".metric-provenance")).toBeVisible();
    await expect(metric.locator(".metric-provenance")).not.toContainText("—");
  }
  await page.goto(LEAD);
  await expect(page.locator(".head-subtitle")).toContainText(
    "handed to IT unlaunched in August 2026",
  );
  const leadCopy = page.locator(".prose");
  await expect(leadCopy).toContainText("six stakeholders");
  await expect(leadCopy).toContainText("senior leaders, who endorsed the model");
  await expect(leadCopy).toContainText("about 600k leads");
  await expect(leadCopy).toContainText("point-in-time features");
  await expect(leadCopy).toContainText("290 call attempts per application");
  await expect(
    page.getByRole("link", { name: "Call Tiering" }).first(),
  ).toHaveAttribute("href", CALL);
  for (const metric of await page.locator(".outcome .metric-details").all()) {
    await metric.locator("summary").click();
    await expect(metric.locator(".metric-provenance")).toBeVisible();
    await expect(metric.locator(".metric-provenance")).not.toContainText("—");
  }
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
  await expectRenderedCopy(page);
  await figure.getByRole("radio", { name: /After/ }).check();
  await expectRenderedCopy(page);
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
  await expectRenderedCopy(page, 10);

  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expectRenderedCopy(page, 9);
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
    await expectRenderedCopy(page, 8 - step);
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
