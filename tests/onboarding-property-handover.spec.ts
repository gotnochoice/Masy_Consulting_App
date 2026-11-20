import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, OPS_LOGIN, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

test("property handover: ops records equipment, verifies and approves it, then the employee signs for it", async ({ page }) => {
  const email = "zztest.property@example.com";
  const employeeId = await createOnboardingTestEmployee(email, {
    PERSONAL_DETAILS: "SUBMITTED",
    IDENTITY_DOCUMENTS: "SUBMITTED",
    GUARANTORS: "SUBMITTED",
    ACKNOWLEDGMENTS: "SUBMITTED",
    SIGNATURE: "SUBMITTED",
  });

  // --- Ops side: record equipment ---
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);

  await page.goto(`/ops/employees/${employeeId}/edit`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Company property")).toBeVisible();

  await page.locator('input[name="itemType"]').fill("ZZTEST Laptop");
  await page.locator('input[name="brand"]').fill("Dell");
  await page.locator('input[name="serialOrImei"]').fill("SN-123456");
  await page.getByRole("button", { name: "Add equipment" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("ZZTEST Laptop -- Dell")).toBeVisible();

  // Equipment exists but isn't verified/approved yet -- employee can't sign.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);
  await page.goto("/me/onboarding/property-handover");
  await expect(page.getByText(/hasn.t been verified and approved/i).or(page.getByText(/waiting on our team to verify and approve/i))).toBeVisible();

  // --- Back to ops: verify + approve ---
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);
  await page.goto(`/ops/employees/${employeeId}/edit`);
  await page.getByRole("button", { name: "Mark verified" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Approve release" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("✓ Verified")).toBeVisible();
  await expect(page.getByText("✓ Management approved")).toBeVisible();

  // --- Employee side: now can sign ---
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);
  await page.goto("/me/onboarding/property-handover");
  await expect(page.getByText("Sign for this equipment")).toBeVisible();

  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("canvas not found");
  await page.mouse.move(box.x + 20, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 30);
  await page.mouse.move(box.x + 200, box.y + 80);
  await page.mouse.up();
  await page.waitForTimeout(100);

  await page.locator("#typedName").fill("ZZTEST Signer");
  await page.locator("input[name='confirmLegal']").check();
  await page.getByRole("button", { name: "Sign", exact: true }).click();
  await page.waitForTimeout(1500);

  // This is the last step -- a successful sign sends the employee back to the overview rather
  // than to a "next step" that doesn't exist.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await page.waitForURL(/\/me\/onboarding$/);

  const { rows: assetRows } = await pool.query<{ status: string }>(`SELECT status FROM "CompanyAsset" WHERE "employeeId" = $1`, [employeeId]);
  expect(assetRows[0].status).toBe("ISSUED");

  const { rows: sigRows } = await pool.query(`SELECT 1 FROM "ESignature" WHERE "employeeId" = $1 AND "documentType" = 'PROPERTY_HANDOVER'`, [employeeId]);
  expect(sigRows).toHaveLength(1);

  // Shows up on the asset register.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);
  await page.goto("/ops/assets");
  await expect(page.getByText("ZZTEST Laptop -- Dell")).toBeVisible();
  await expect(page.getByText("SN-123456")).toBeVisible();
});
