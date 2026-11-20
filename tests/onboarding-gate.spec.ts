import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { OPS_LOGIN, EMPLOYEE_LOGIN, pool } from "./helpers";

const ZZTEST_EMAIL = "zztest.newhire@example.com";
const ZZTEST_PASSWORD = "ZzTest#2026";

async function cleanup() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
  for (const { id } of rows) {
    await pool.query(`DELETE FROM "OnboardingStep" WHERE "onboardingProcessId" IN (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`, [id]);
    await pool.query(`DELETE FROM "OnboardingProcess" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "OnboardingTask" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "User" WHERE "employeeId" = $1`, [id]);
  }
  await pool.query(`DELETE FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
}

test.afterEach(cleanup);

test("a brand-new employee is gated to /me/onboarding until steps are verified; pre-existing employees are unaffected", async ({ page }) => {
  // Create the employee through the real Ops form so createOnboardingProcess fires exactly as
  // it would in production.
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);

  await page.goto("/ops/employees");
  await page.waitForLoadState("networkidle");
  await page.locator("#name").fill("ZZTEST New Hire");
  await page.locator("#roleTitle").fill("ZZTEST Sales Associate");
  await page.locator("select[name='clientOrgId']").selectOption({ label: "Lagos Bites Catering" });
  await page.locator("#startDate").fill("2026-12-01");
  await page.getByRole("button", { name: "Add employee" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  const { rows: employees } = await pool.query<{ id: string }>(`SELECT id FROM "Employee" WHERE name = 'ZZTEST New Hire'`);
  expect(employees).toHaveLength(1);
  const employeeId = employees[0].id;

  const { rows: steps } = await pool.query<{ stepType: string; status: string }>(
    `SELECT "stepType", status FROM "OnboardingStep" os JOIN "OnboardingProcess" op ON op.id = os."onboardingProcessId" WHERE op."employeeId" = $1`,
    [employeeId],
  );
  expect(steps).toHaveLength(6);
  expect(steps.every((s) => s.status === "NOT_STARTED")).toBe(true);

  const passwordHash = await bcrypt.hash(ZZTEST_PASSWORD, 10);
  await pool.query(`INSERT INTO "User" (id, email, "passwordHash", role, "employeeId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, 'EMPLOYEE', $3, now())`, [
    ZZTEST_EMAIL,
    passwordHash,
    employeeId,
  ]);

  await page.goto("/login");
  await page.getByLabel("Email").fill(ZZTEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  // The privacy-consent notice gates everything else, recorded with a timestamp before any
  // personal data collection starts.
  await expect(page.getByRole("heading", { name: "Before we begin" })).toBeVisible();
  await page.getByRole("button", { name: "I understand, continue" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("0 of 6 verified")).toBeVisible();

  // Direct navigation to a normal page should also bounce back to onboarding, not render it.
  await page.goto("/me/attendance");
  await page.waitForURL(/\/me\/onboarding/);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  // Personal details step renders, and falls back to manual bank entry visibly (no PAYSTACK
  // key in this sandbox) instead of crashing -- same bug class as the AI/blob integrations.
  await page.goto("/me/onboarding/personal-details");
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
  await expect(page.getByText(/we.ll confirm the account before your first payment/i)).toBeVisible();

  // A pre-existing seeded employee (no OnboardingProcess row) must not be gated at all.
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/profile/);
  await expect(page).toHaveURL(/\/me\/profile/);
});
