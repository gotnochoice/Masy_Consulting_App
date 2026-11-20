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

  // A draft is for partial progress -- filling in just one field and saving must work, not get
  // silently blocked by every other required field in the form (the browser's native validation
  // doesn't know "Save draft" means partial is fine; the form opts out of it with noValidate and
  // leaves required-ness enforcement to the server, which only applies it to the real Submit).
  await page.locator("#name").fill("ZZTEST Personal Details");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("Draft saved")).toBeVisible();
  await expect(page.locator("#name")).toHaveValue("ZZTEST Personal Details");

  const { rows: afterPartialDraft } = await pool.query<{ name: string; phone: string | null }>(
    `SELECT name, phone FROM "Employee" WHERE id = $1`,
    [employeeId],
  );
  expect(afterPartialDraft[0].name).toBe("ZZTEST Personal Details");
  expect(afterPartialDraft[0].phone).toBeNull();

  // Submit still enforces every required field -- just server-side now instead of via the
  // browser's native validation, since that's disabled for the whole form (see above). Still
  // incomplete at this point, so this must surface an error and not mark the step submitted.
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/date of birth is required/i)).toBeVisible();
  const { rows: stillNotSubmitted } = await pool.query<{ status: string }>(
    `SELECT status FROM "OnboardingStep" os JOIN "OnboardingProcess" op ON op.id = os."onboardingProcessId" WHERE op."employeeId" = $1 AND os."stepType" = 'PERSONAL_DETAILS'`,
    [employeeId],
  );
  expect(stillNotSubmitted[0].status).not.toBe("SUBMITTED");

  await page.locator("#dateOfBirth").fill("1995-05-01");
  await page.locator("#phone").fill("08033333333");
  await page.locator("#personalEmail").fill("zztest.pd@example.com");
  await page.locator("#address").fill("3 Test Street, Lagos");
  await page.locator("#emergencyContactName").fill("ZZTEST Emergency Contact");
  await page.locator("#emergencyContactPhone").fill("08044444444");
  await page.locator("#bankAccountNumber").fill("0123456789");

  // No Paystack key is configured in this environment, so the bank list fails to load --
  // onboarding must not be blocked on that: the form falls back to manual bank-name and
  // account-holder-name entry instead of Paystack's verify flow.
  await expect(page.getByText(/we.ll confirm the account before your first payment/i)).toBeVisible();
  await page.locator("#bankNameManual").fill("ZZTEST Bank");
  await page.locator("#accountHolderNameManual").fill("ZZTEST Personal Details");
  await page.locator("input[name='confirmWillUpdate']").check();
  await page.locator("input[name='confirmBankAccountIsMine']").check();

  // Saving a draft again with everything filled in must still work and not clear the form.
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
