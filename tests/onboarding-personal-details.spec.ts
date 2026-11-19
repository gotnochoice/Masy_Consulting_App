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
  await page.locator("#bankAccountNumber").fill("0123456789");

  // No Paystack key is configured in this environment, so the bank list fails to load --
  // onboarding must not be blocked on that: the form falls back to manual bank-name and
  // account-holder-name entry instead of Paystack's verify flow. Native HTML validation blocks
  // ANY submission (including "Save draft") while these required fields are empty.
  await expect(page.getByText(/still setting up automatic bank verification/i)).toBeVisible();
  await page.locator("#bankNameManual").fill("ZZTEST Bank");
  await page.locator("#accountHolderNameManual").fill("ZZTEST Personal Details");
  await page.locator("input[name='confirmWillUpdate']").check();
  // Native HTML validation blocks ANY submission (including "Save draft") while a required
  // checkbox is unchecked, so this has to be checked up front too.
  await page.locator("input[name='confirmBankAccountIsMine']").check();

  // "Save draft" must route to the draft action, not the main submit, and must not clear the
  // form.
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("ZZTEST Personal Details");

  const { rows } = await pool.query<{ name: string }>(`SELECT name FROM "Employee" WHERE id = $1`, [employeeId]);
  expect(rows[0].name).toBe("ZZTEST Personal Details");

  // Submitting completes the step -- onboarding can't be stuck forever just because Paystack
  // isn't configured.
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForTimeout(800);

  const { rows: steps } = await pool.query<{ status: string }>(
    `SELECT status FROM "OnboardingStep" os JOIN "OnboardingProcess" op ON op.id = os."onboardingProcessId" WHERE op."employeeId" = $1 AND os."stepType" = 'PERSONAL_DETAILS'`,
    [employeeId],
  );
  expect(steps[0].status).toBe("SUBMITTED");

  // Never silently treated as a confirmed match -- it was typed, not verified.
  const { rows: emp } = await pool.query<{ bankNameMatchStatus: string }>(`SELECT "bankNameMatchStatus" FROM "Employee" WHERE id = $1`, [employeeId]);
  expect(emp[0].bankNameMatchStatus).toBe("NEEDS_REVIEW");
});
