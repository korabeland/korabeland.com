import { test, expect } from "@playwright/test";

test.describe("Theme toggle icon visibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows only the sun icon in light mode", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });

    const sun = page.locator("#theme-toggle .icon-sun");
    const moon = page.locator("#theme-toggle .icon-moon");

    await expect(sun).toBeVisible();
    await expect(moon).not.toBeVisible();
  });

  test("shows only the moon icon in dark mode", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });

    const sun = page.locator("#theme-toggle .icon-sun");
    const moon = page.locator("#theme-toggle .icon-moon");

    await expect(moon).toBeVisible();
    await expect(sun).not.toBeVisible();
  });

  test("toggles from sun to moon when switching to dark mode", async ({
    page,
  }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });

    const sun = page.locator("#theme-toggle .icon-sun");
    const moon = page.locator("#theme-toggle .icon-moon");

    await expect(sun).toBeVisible();
    await expect(moon).not.toBeVisible();

    await page.locator("#theme-toggle").click();

    await expect(moon).toBeVisible();
    await expect(sun).not.toBeVisible();
  });

  test("toggles from moon to sun when switching to light mode", async ({
    page,
  }) => {
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });

    const sun = page.locator("#theme-toggle .icon-sun");
    const moon = page.locator("#theme-toggle .icon-moon");

    await expect(moon).toBeVisible();
    await expect(sun).not.toBeVisible();

    await page.locator("#theme-toggle").click();

    await expect(sun).toBeVisible();
    await expect(moon).not.toBeVisible();
  });

  test("never shows both icons simultaneously after multiple toggles", async ({
    page,
  }) => {
    const sun = page.locator("#theme-toggle .icon-sun");
    const moon = page.locator("#theme-toggle .icon-moon");
    const toggle = page.locator("#theme-toggle");

    for (let i = 0; i < 6; i++) {
      await toggle.click();

      const theme =
        await page.evaluate(() =>
          document.documentElement.getAttribute("data-theme"),
        );

      if (theme === "dark") {
        await expect(moon).toBeVisible();
        await expect(sun).not.toBeVisible();
      } else {
        await expect(sun).toBeVisible();
        await expect(moon).not.toBeVisible();
      }
    }
  });
});
