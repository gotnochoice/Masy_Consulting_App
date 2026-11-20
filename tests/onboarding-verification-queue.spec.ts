import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, OPS_LOGIN, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

async function loginAsOps(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);
}

test("verification queue: HR verifies simple steps, logs guarantor checks, countersigns, and completes onboarding", async ({ page }) => {
  const email = "zztest.queue@example.com";
  const employeeId = await createOnboardingTestEmployee(email, {
    PERSONAL_DETAILS: "SUBMITTED",
    IDENTITY_DOCUMENTS: "SUBMITTED",
    GUARANTORS: "SUBMITTED",
    ACKNOWLEDGMENTS: "SUBMITTED",
    SIGNATURE: "SUBMITTED",
    PROPERTY_HANDOVER: "SUBMITTED",
  });

  // Seed two guarantors and two signed-but-not-countersigned ESignature rows directly, since
  // those come from steps already covered by their own dedicated tests.
  await pool.query(
    `INSERT INTO "Guarantor" (id, "employeeId", name, relationship, phone, email, address, "consentConfirmed", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST G1', 'Uncle', '08011110000', 'g1@example.com', 'Addr 1', true, now()),
            (gen_random_uuid()::text, $1, 'ZZTEST G2', 'Aunt', '08022220000', 'g2@example.com', 'Addr 2', true, now())`,
    [employeeId],
  );
  await pool.query(
    `INSERT INTO "ESignature" (id, "employeeId", "documentType", "typedName", "signatureImageData", "ipAddress", "documentHash", "signedAt")
     VALUES (gen_random_uuid()::text, $1, 'EMPLOYMENT_AGREEMENT', 'ZZTEST Signer', 'data:image/png;base64,x', '127.0.0.1', 'hash1', now()),
            (gen_random_uuid()::text, $1, 'HANDBOOK', 'ZZTEST Signer', 'data:image/png;base64,x', '127.0.0.1', 'hash2', now())`,
    [employeeId],
  );
  await pool.query(
    `INSERT INTO "CompanyAsset" (id, "employeeId", "itemType", status, "createdById", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Laptop', 'ISSUED', $1, now(), now())`,
    [employeeId],
  );

  await loginAsOps(page);
  await page.goto("/ops/onboarding");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("ZZTEST Onboarding Hire")).toBeVisible();

  // Simple steps: verify them one at a time. Property handover is currently out of the active
  // sequence (see ONBOARDING_STEP_ORDER) while it's being redesigned, so Ops never sees it here.
  for (const stepType of ["PERSONAL_DETAILS", "IDENTITY_DOCUMENTS", "ACKNOWLEDGMENTS"]) {
    const row = page.locator(`div[data-step="${stepType}"]`);
    await row.getByRole("button", { name: "Mark verified" }).click();
    await page.waitForTimeout(500);
  }

  // Guarantors: log both -- each has its own form, so target them by index, not .first()
  // twice (which would just resubmit the same guarantor's form).
  await page.locator("select[name='method']").nth(0).selectOption("PHONE_CALL");
  await page.locator("select[name='result']").nth(0).selectOption("VERIFIED");
  await page.getByRole("button", { name: "Log" }).nth(0).click();
  await page.waitForTimeout(500);
  await page.locator("select[name='method']").nth(1).selectOption("PHONE_CALL");
  await page.locator("select[name='result']").nth(1).selectOption("VERIFIED");
  await page.getByRole("button", { name: "Log" }).nth(1).click();
  await page.waitForTimeout(500);

  const guarantorsRow = page.locator('div[data-step="GUARANTORS"]');
  await guarantorsRow.getByRole("button", { name: "Mark verified" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  // Signature: countersign.
  await page.locator('input[name="typedName"]').fill("ZZTEST Founder");
  await page.getByRole("button", { name: "Countersign" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  // All steps verified -- complete onboarding.
  await page.getByRole("button", { name: "Mark onboarding complete" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  const { rows: processRows } = await pool.query<{ completedAt: Date | null }>(
    `SELECT "completedAt" FROM "OnboardingProcess" WHERE "employeeId" = $1`,
    [employeeId],
  );
  expect(processRows[0].completedAt).not.toBeNull();

  const { rows: taskRows } = await pool.query<{ label: string }>(`SELECT label FROM "OnboardingTask" WHERE "employeeId" = $1 ORDER BY label`, [employeeId]);
  expect(taskRows.map((t) => t.label).sort()).toEqual(["Day 30 review", "Day 60 review", "Day 90 review"]);

  const { rows: sigRows } = await pool.query<{ countersignedAt: Date | null }>(`SELECT "countersignedAt" FROM "ESignature" WHERE "employeeId" = $1`, [employeeId]);
  expect(sigRows.every((s) => s.countersignedAt !== null)).toBe(true);

  // The employee's dashboard is now unlocked.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/profile/);
});

test("onboarding completes without ever touching property handover, when no equipment was ever recorded", async ({ page }) => {
  const email = "zztest.queue.noequip@example.com";
  const employeeId = await createOnboardingTestEmployee(email, {
    PERSONAL_DETAILS: "VERIFIED",
    IDENTITY_DOCUMENTS: "VERIFIED",
    GUARANTORS: "VERIFIED",
    ACKNOWLEDGMENTS: "VERIFIED",
    SIGNATURE: "VERIFIED",
    // PROPERTY_HANDOVER left at its default NOT_STARTED -- no CompanyAsset row of any kind
    // (not even the "no equipment" sentinel) exists for this employee, matching a role no one
    // at Ops has ever touched the equipment question for.
  });

  await loginAsOps(page);
  await page.goto("/ops/onboarding");
  const card = page.locator("div.rounded-card").filter({ has: page.locator(`a[href="/ops/employees/${employeeId}/edit"]`) });
  await card.getByRole("button", { name: "Mark onboarding complete" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/every step must be verified first/i)).toHaveCount(0);

  const { rows: processRows } = await pool.query<{ completedAt: Date | null }>(
    `SELECT "completedAt" FROM "OnboardingProcess" WHERE "employeeId" = $1`,
    [employeeId],
  );
  expect(processRows[0].completedAt).not.toBeNull();

  const { rows: stepRows } = await pool.query<{ status: string }>(
    `SELECT status FROM "OnboardingStep" WHERE "stepType" = 'PROPERTY_HANDOVER' AND "onboardingProcessId" = (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`,
    [employeeId],
  );
  expect(stepRows[0].status).toBe("NOT_STARTED");
});
