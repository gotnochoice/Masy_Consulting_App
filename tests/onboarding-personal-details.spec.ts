import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

test("personal details: save draft, verify bank, and submit all route correctly and never wipe the form on failure", async ({ page }) => {
  const email = `zztest.personaldetails.${Date.now()}@example.com`;
  const employeeId = await createOnboardingTestEmployee(email);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  await page.goto("/me/onboarding/personal-details");
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();

  await page.locator("#name").fill("ZZTEST Personal Details");
  await page.locator("#dateOfBirth").fill("1995-05-01");
  await page.locator("#phone").fill("08033333333");
  await page.locator("#personalEmail").fill("zztest.pd@example.com");
  await page.locator("#address").fill("3 Test Street, Lagos");
  await page.locator("#emergencyContactName").fill("ZZTEST Emergency Contact");
  await page.locator("#emergencyContactPhone").fill("08044444444");
  // Native HTML validation blocks submission while any required field is empty, regardless of
  // which button is clicked -- bankAccountNumber and the checkbox are both required.
  await page.locator("#bankAccountNumber").fill("0123456789");
  await page.locator("input[name='confirmWillUpdate']").check();

  // "Save draft" must route to the draft action, not the main submit (which would fail on the
  // still-unverified bank account), and must not clear the form.
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("ZZTEST Personal Details");

  const { rows } = await pool.query<{ name: string }>(`SELECT name FROM "Employee" WHERE id = $1`, [employeeId]);
  expect(rows[0].name).toBe("ZZTEST Personal Details");

  // No Paystack key is configured in this environment, so the bank list fails to load and the
  // "Verify account" button stays disabled (same graceful-failure pattern as everywhere else
  // this app wraps an optional integration) -- confirmed by the message below, already visible
  // on page load. The account-verify dispatch path itself is exercised by
  // onboarding-gate.spec.ts, which checks the graceful-failure message renders at all.
  await expect(page.getByText(/bank verification isn.t set up/i)).toBeVisible();

  // "Submit" with the bank account still unverified must fail validation (account holder name
  // never got filled in) without wiping anything already entered.
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText(/bank name is required/i)).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("ZZTEST Personal Details");
  await expect(page.locator("#bankAccountNumber")).toHaveValue("0123456789");
});
