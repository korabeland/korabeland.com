import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  postRoutesSync,
  projectRoutesSync,
  staticRoutes,
} from "../lib/collection-routes";

// Sync (not the async reader-based helper): Playwright transforms spec files
// to CJS, where a top-level `await` throws at collect time.
const ROUTES = [
  ...staticRoutes,
  ...projectRoutesSync().map((entry) => entry.path),
  ...postRoutesSync().map((entry) => entry.path),
  // Dev-only previews — the only place the experience and skills sections
  // render until real content lands, so axe checks their markup and contrast.
  "/dev/experience-preview",
  "/dev/skills-preview",
  // The permanent tailored-page fixture — a real shipping (noindex) page.
  "/for/demo",
];

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
