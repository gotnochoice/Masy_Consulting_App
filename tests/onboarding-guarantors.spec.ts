import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

test("guarantors step rejects a duplicate second guarantor, then succeeds with two distinct ones", async ({ page }) => {
  const email = "zztest.guarantors@example.com";
  const employeeId = await createOnboardingTestEmployee(email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  await page.goto("/me/onboarding/guarantors");
  await expect(page.getByRole("heading", { name: "Guarantors" })).toBeVisible();

  await page.locator("#g1_name").fill("ZZTEST Guarantor One");
  await page.locator("#g1_relationship").fill("Uncle");
  await page.locator("#g1_phone").fill("08011111111");
  await page.locator("#g1_email").fill("g1@example.com");
  await page.locator("#g1_address").fill("1 Test Street, Lagos");
  await page.locator("input[name='g1_consent']").check();

  // Same phone number as guarantor 1 -- should be rejected as a duplicate person.
  await page.locator("#g2_name").fill("ZZTEST Guarantor Two");
  await page.locator("#g2_relationship").fill("Aunt");
  await page.locator("#g2_phone").fill("08011111111");
  await page.locator("#g2_email").fill("g2@example.com");
  await page.locator("#g2_address").fill("2 Test Street, Lagos");
  await page.locator("input[name='g2_consent']").check();

  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/must be different people/i)).toBeVisible();

  // Re-fill everything, including both checkboxes -- a failed submission here resets the
  // whole form, so nothing can be assumed to persist across the retry. Tracked separately
  // as a UX follow-up (task: investigate form-state reset on failed onboarding submissions).
  await page.locator("#g1_name").fill("ZZTEST Guarantor One");
  await page.locator("#g1_relationship").fill("Uncle");
  await page.locator("#g1_phone").fill("08011111111");
  await page.locator("#g1_email").fill("g1@example.com");
  await page.locator("#g1_address").fill("1 Test Street, Lagos");
  await page.locator("input[name='g1_consent']").check();
  await page.locator("#g2_name").fill("ZZTEST Guarantor Two");
  await page.locator("#g2_relationship").fill("Aunt");
  await page.locator("#g2_phone").fill("08022222222");
  await page.locator("#g2_email").fill("g2@example.com");
  await page.locator("#g2_address").fill("2 Test Street, Lagos");
  await page.locator("input[name='g2_consent']").check();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/waiting on HR to verify/i)).toBeVisible();

  const { rows: guarantors } = await pool.query<{ name: string }>(
    `SELECT name FROM "Guarantor" WHERE "employeeId" = $1 ORDER BY "createdAt"`,
    [employeeId],
  );
  expect(guarantors.map((g) => g.name)).toEqual(["ZZTEST Guarantor One", "ZZTEST Guarantor Two"]);
});
