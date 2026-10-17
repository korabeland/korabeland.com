import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// /resume reads the same experience and skills data as About. The content-gated
// states are covered through the dev-only fixture route, per AGENTS.md §2.

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .exclude("vite-error-overlay")
    .analyze();
  return results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

/** Page count of a PDF buffer, from its /Type /Page objects. */
function pdfPages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? [])
    .length;
}

test("/resume renders the authored experience and skills", async ({ page }) => {
  const response = await page.goto("/resume");
  expect(response?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Korab Eland");
  await expect(page.locator(".resume-role")).toHaveCount(5);
  await expect(page.locator(".resume-role-title").first()).toHaveText(
    "Customer Experience Manager",
  );
  await expect(page.locator(".resume-period").first()).toHaveText("2021–2026");
  await expect(page.locator(".resume-metric").first()).toContainText("30%");
  await expect(page.locator(".resume-skill-row")).toHaveCount(5);
  await expect(page.getByRole("list", { name: "Education" })).toBeVisible();
  // Testimonials and certifications stay off the one-page brief.
  await expect(page.locator("blockquote")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("—");
  await expect(
    page.locator('.resume-contact a[href="mailto:hello@korabeland.com"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /print or save/i }),
  ).toBeVisible();
});

test("resume identity and contacts match the rendered home page", async ({
  page,
}) => {
  await page.goto("/");
  const homeName = (await page.locator(".chrome-brand-text").innerText())
    .trim()
    .toLocaleLowerCase();
  const homeHeadline = await page
    .locator("#hero-heading")
    .evaluate((heading) => {
      const visible = heading.cloneNode(true) as HTMLElement;
      visible.querySelectorAll(".sr-only").forEach((node) => {
        node.remove();
      });
      return visible.innerText.replace(/\s+/g, " ").trim();
    });
  const homeContacts = await page
    .locator(".hero-social-link")
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href).sort(),
    );

  await page.goto("/resume");
  const resumeName = (await page.locator(".resume-name").innerText())
    .trim()
    .toLocaleLowerCase();
  const resumeHeadline = await page.locator(".resume-headline").innerText();
  const resumeContacts = await page
    .locator(".resume-contact a")
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href).sort(),
    );

  expect(resumeName).toBe(homeName);
  expect(resumeHeadline).toBe(homeHeadline);
  expect(resumeContacts).toEqual(homeContacts);
});

test("About links to /resume from the experience section", async ({ page }) => {
  await page.goto("/about");
  const link = page.locator(".experience-section a[href='/resume']");
  await expect(link).toHaveCount(1);
  await link.click();
  await expect(page).toHaveURL(/\/resume$/);
});

test("the print button calls window.print", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed += 1;
    };
  });
  await page.goto("/resume");
  await page.getByRole("button", { name: /print or save/i }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __printed: number }).__printed,
    ),
  ).toBe(1);
});

test("/dev/resume-preview gates sections on data", async ({ page }) => {
  const response = await page.goto("/dev/resume-preview");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".resume-role")).toHaveCount(2);
  await expect(page.locator(".resume-period").first()).toHaveText(
    "2021–present",
  );
  // A role with no location shows the company alone; a bullet with no metric
  // shows none.
  await expect(page.locator(".resume-org").nth(1)).toHaveText("Prior Co");
  await expect(page.locator(".resume-metric")).toHaveCount(2);
  await expect(page.getByText("6 · stakeholders")).toBeVisible();
  await expect(page.locator("blockquote")).toHaveCount(0);
  await expect(page.getByText("Some Certification")).toHaveCount(0);
  await expect(page.locator(".resume-skill-row")).toHaveCount(2);
});

test("/dev/resume-preview?empty=1 renders only the header", async ({
  page,
}) => {
  await page.goto("/dev/resume-preview?empty=1");
  await expect(page.locator("h1")).toHaveText("Korab Eland");
  await expect(page.locator(".resume-section")).toHaveCount(0);
});

for (const route of ["/resume", "/dev/resume-preview"]) {
  for (const shift of ["night", "day"]) {
    test(`a11y: ${route} (${shift})`, async ({ page }) => {
      await page.goto(`${route}?shift=${shift}`);
      await page.waitForLoadState("networkidle");
      const violations = await seriousViolations(page);
      expect(violations, JSON.stringify(violations, null, 2)).toHaveLength(0);
    });
  }
}

test.describe("print layout", () => {
  test("hides chrome and controls and prints black on white", async ({
    page,
  }) => {
    await page.goto("/resume?shift=night");
    await page.emulateMedia({ media: "print" });
    for (const selector of [
      ".chrome",
      ".site-footer",
      ".skip-link",
      ".resume-actions",
      ".resume-print",
    ]) {
      await expect(page.locator(selector), selector).toBeHidden();
    }
    const colours = await page.evaluate(() => {
      const style = (el: Element) => getComputedStyle(el);
      return {
        body: style(document.body).backgroundColor,
        text: style(document.querySelector(".resume-bullet") as Element).color,
        title: style(document.querySelector(".resume-role-title") as Element)
          .color,
      };
    });
    expect(colours).toEqual({
      body: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      title: "rgb(0, 0, 0)",
    });
    // Contact addresses are visible text, so paper keeps them.
    const contact = await page.locator(".resume-contact").innerText();
    expect(contact).toContain("hello@korabeland.com");
    expect(contact).toContain("linkedin.com/in/korabeland");
  });

  test("fits one page on US Letter and A4", async ({ page }) => {
    await page.goto("/resume?shift=day");
    await page.evaluate(() => document.fonts.ready);
    for (const format of ["Letter", "A4"] as const) {
      // preferCSSPageSize applies the sheet's own @page margins.
      const pdf = await page.pdf({ format, preferCSSPageSize: true });
      expect(pdfPages(pdf), format).toBe(1);
    }
  });
});
