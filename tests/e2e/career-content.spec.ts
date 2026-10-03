import { expect, test } from "@playwright/test";

test("homepage publishes the approved career history and linked endorsements", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator(".experience-section");
  await expect(section.locator(".experience-role")).toHaveText([
    "Customer Experience Manager",
    "Marketing and CX Manager",
    "Marketing Manager",
    "Digital Media Specialist",
    "Digital Media Buyer",
  ]);
  await expect(section.locator(".experience-period")).toHaveText([
    "2021–2026",
    "2019–2021",
    "2017–2019",
    "2015–2017",
    "2013–2015",
  ]);
  await expect(section).toContainText("2021–2026");
  await expect(section).toContainText("Plattform Education");
  await expect(section).toContainText("Lenexa, Kansas");
  for (const name of ["John Bright", "Britni Mapel", "Fern Speechley"]) {
    await expect(
      section.getByRole("link", { name: new RegExp(name) }),
    ).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/korabeland/details/recommendations/",
    );
  }
  await expect(section).not.toContainText("—");
  await expect(page.locator(".hero-reloc")).toContainText("washington dc");
});

test("About separates education from certificates and displays the current base", async ({
  page,
}) => {
  await page.goto("/about");
  const section = page.locator(".skills-section");
  await expect(section.locator(".skills-cat")).toHaveCount(5);
  const education = section.getByRole("list", {
    name: "Education",
    exact: true,
  });
  await expect(education.getByRole("listitem")).toHaveCount(4);
  await expect(education).toContainText(
    "Bachelor of Science in Journalism, Strategic Communications",
  );
  await expect(education).toContainText("James Cook University");
  const certificates = section.getByRole("list", {
    name: "Certifications",
    exact: true,
  });
  await expect(certificates.getByRole("listitem")).toHaveCount(6);
  await expect(certificates.getByRole("link")).toHaveCount(6);
  await expect(certificates).not.toContainText("Bachelor");
  await expect(page.locator(".about-authorization")).toHaveText(
    "washington dc · us and australian citizen",
  );
  await expect(page.locator(".about-body")).toContainText(
    "At Keypath Education I spent over a decade moving through that arc: media buyer, digital media specialist, marketing manager, marketing and CX manager, and finally CX manager for the Australian portfolio.",
  );
});
