import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, OPS_LOGIN, EMPLOYEE_LOGIN, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

// This sandbox has no Vercel Blob token configured (true for every file-upload path in this
// app, not just this one -- see onboarding-signature.spec.ts), so the PDF upload itself always
// fails here and fileUrl stays null. That's exactly the "storage unavailable" path this test
// exercises: the record row must still get created (not silently vanish), HR gets a way to
// retry, and access control is enforced before the file lookup either way.
test("completing onboarding creates a record even when PDF storage is unavailable, and access control holds", async ({ page, request }) => {
  const email = "zztest.record@example.com";
  const employeeId = await createOnboardingTestEmployee(email, {
    PERSONAL_DETAILS: "VERIFIED",
    IDENTITY_DOCUMENTS: "VERIFIED",
    GUARANTORS: "VERIFIED",
    ACKNOWLEDGMENTS: "VERIFIED",
    SIGNATURE: "VERIFIED",
    PROPERTY_HANDOVER: "VERIFIED",
  });

  await pool.query(
    `UPDATE "Employee" SET nin = '12345678901', "bankAccountNumber" = '0123456789', "bankName" = 'ZZTEST Bank', "bankAccountHolderName" = 'ZZTEST Onboarding Hire' WHERE id = $1`,
    [employeeId],
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);

  await page.goto("/ops/onboarding");
  const card = page.locator("div.rounded-card").filter({ has: page.locator(`a[href="/ops/employees/${employeeId}/edit"]`) });
  await card.getByRole("button", { name: "Mark onboarding complete" }).click();
  await page.waitForTimeout(1500);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  const { rows } = await pool.query<{ id: string; version: number; recordNumber: string; fileUrl: string | null }>(
    `SELECT id, version, "recordNumber", "fileUrl" FROM "OnboardingRecord" WHERE "employeeId" = $1`,
    [employeeId],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].version).toBe(1);
  expect(rows[0].fileUrl).toBeNull();
  const recordId = rows[0].id;

  const cookieHeader = (cookies: { name: string; value: string }[]) => cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  // Unauthenticated and cross-employee access are both rejected before the file is even looked
  // up -- this must hold regardless of whether the file itself is available.
  const anon = await request.get(`/api/onboarding-records/${recordId}`);
  expect(anon.status()).toBe(401);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);
  const otherCookies = await page.context().cookies();
  const forbidden = await request.get(`/api/onboarding-records/${recordId}`, { headers: { cookie: cookieHeader(otherCookies) } });
  expect(forbidden.status()).toBe(403);

  // The employee it belongs to is authorized, but gets a clear "not available" response (not a
  // crash) since there's no file to serve -- and the profile page doesn't show a dead link.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("ZzTest#2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);
  await page.goto("/me/profile");
  await expect(page.getByRole("link", { name: "Onboarding record" })).toHaveCount(0);
  const ownCookies = await page.context().cookies();
  const ownResponse = await request.get(`/api/onboarding-records/${recordId}`, { headers: { cookie: cookieHeader(ownCookies) } });
  expect(ownResponse.status()).toBe(503);

  // Every authorized view attempt is still logged, file available or not.
  const { rows: logs } = await pool.query(`SELECT * FROM "AuditLog" WHERE action = 'onboarding_record.view' AND "targetId" = $1`, [recordId]);
  expect(logs.length).toBeGreaterThan(0);

  // HR sees a retry option instead of a dead download link, and retrying creates the next
  // version rather than touching the failed one.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops/);
  await page.goto(`/ops/employees/${employeeId}/edit`);
  await page.getByRole("button", { name: /onboarding record failed to generate -- retry/i }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);

  const { rows: afterRetry } = await pool.query<{ version: number; recordNumber: string }>(
    `SELECT version, "recordNumber" FROM "OnboardingRecord" WHERE "employeeId" = $1 ORDER BY version`,
    [employeeId],
  );
  expect(afterRetry.map((r) => r.version)).toEqual([1, 2]);
  expect(afterRetry[0].recordNumber).toBe(afterRetry[1].recordNumber);
});
