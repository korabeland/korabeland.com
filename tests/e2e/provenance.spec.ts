import { expect, test } from "@playwright/test";

// R2/AE4 — every case-study outcome metric discloses its provenance via a
// native <details>/<summary>. Click/tap/Enter is the canonical interaction;
// the element's built-in behaviour means no-JS visitors get the same
// open/close flow for free (not separately exercised here — a JS-disabled
// context isn't warranted for a native element, per the plan's edge-case
// note).

test("activating a metric marker opens and closes the provenance disclosure", async ({
  page,
}) => {
  await page.goto("/work/lead-scoring");

  const details = page.locator(".metric-details").first();
  const summary = details.locator("summary.metric");

  await expect(details).not.toHaveAttribute("open", "");

  await summary.click();
  await expect(details).toHaveAttribute("open", "");
  await expect(details.locator(".metric-provenance")).toBeVisible();
  await expect(details.locator(".metric-provenance")).not.toBeEmpty();

  await summary.click();
  await expect(details).not.toHaveAttribute("open", "");
});

// U8 — the trigger self-describes for AT without an aria-label override:
// the accessible name must still LEAD with the metric's own label/value
// (an aria-label would replace it and make every row announce identically),
// and end with the visually-hidden "how this was measured" affordance.
test("provenance trigger accessible name keeps the metric and adds the affordance", async ({
  page,
}) => {
  await page.goto("/work/lead-scoring");

  const summaries = page.locator("summary.metric");
  const count = await summaries.count();
  expect(count).toBeGreaterThan(0);

  const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    const summary = summaries.nth(i);
    const name = await summary.evaluate(
      (el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "",
    );
    expect(name.toLowerCase()).toContain("how this was measured");
    // Each row's name must stay distinct — the metric's own label/value
    // must survive in the computed name.
    names.add(name);
  }
  expect(names.size).toBe(count);
  await expect(summaries.first().locator("[aria-label]")).toHaveCount(0);
});

test("keyboard: focusing a marker and pressing Enter drives the same disclosure flow", async ({
  page,
}) => {
  await page.goto("/work/lead-scoring");

  const details = page.locator(".metric-details").first();
  const summary = details.locator("summary.metric");

  await summary.focus();
  await expect(summary).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");

  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open", "");
});

test("every outcome metric on a case study carries its own provenance disclosure", async ({
  page,
}) => {
  await page.goto("/work/lead-scoring");

  const detailsCount = await page.locator(".metric-details").count();
  expect(detailsCount).toBeGreaterThan(0);

  for (let i = 0; i < detailsCount; i++) {
    const details = page.locator(".metric-details").nth(i);
    await details.locator("summary.metric").click();
    await expect(details.locator(".metric-provenance")).not.toBeEmpty();
  }
});
