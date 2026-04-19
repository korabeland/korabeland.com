import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/colophon", "/off-trail"];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .exclude("vite-error-overlay") // dev-server artifact; not present in production
      .analyze();
    const violations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
  });
}
