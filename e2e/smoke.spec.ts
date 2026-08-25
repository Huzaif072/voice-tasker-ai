import { expect, test } from "@playwright/test";

const e2eEmail = process.env.E2E_TEST_EMAIL;
const e2ePassword = process.env.E2E_TEST_PASSWORD;

test("public landing and legal navigation render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("aria-label", "VoiceTasker AI product overview");
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();
  await page.goto("/terms");
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
});

test("authenticated dashboard navigation works on desktop and mobile", async ({ page }) => {
  test.skip(!e2eEmail || !e2ePassword, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated browser coverage.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eEmail!);
  await page.getByLabel("Password").fill(e2ePassword!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard(?:$|\/)/);

  const viewport = page.viewportSize();
  if ((viewport?.width ?? 1024) < 768) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
  }
  await page.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/\/dashboard\/tasks$/);
  await page.getByRole("link", { name: "Notifications" }).click();
  await expect(page).toHaveURL(/\/dashboard\/notifications$/);
});
