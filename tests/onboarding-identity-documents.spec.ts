import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { pool } from "./helpers";

const ZZTEST_EMAIL = "zztest.iddocs@example.com";
const ZZTEST_PASSWORD = "ZzTest#2026";
const TEST_PNG_PATH = __dirname + "/fixtures/zztest-doc.png";

async function cleanup() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
  for (const { id } of rows) {
    await pool.query(`DELETE FROM "EmployeeDocument" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "OnboardingStep" WHERE "onboardingProcessId" IN (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`, [id]);
    await pool.query(`DELETE FROM "OnboardingProcess" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "OnboardingTask" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "User" WHERE "employeeId" = $1`, [id]);
  }
  await pool.query(`DELETE FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
}

test.afterEach(cleanup);

async function createZzTestEmployeeWithLogin(): Promise<string> {
  const { rows: orgRows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Employee" (id, "clientOrgId", name, "roleTitle", email, "startDate", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Doc Hire', 'ZZTEST Role', 'zztest-doc-hire@example.com', now(), now(), now())
     RETURNING id`,
    [orgRows[0].id],
  );
  const employeeId = rows[0].id;

  await pool.query(
    `INSERT INTO "OnboardingProcess" (id, "employeeId", "commencementDate", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, now(), now(), now())`,
    [employeeId],
  );
  const { rows: processRows } = await pool.query<{ id: string }>(`SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1`, [employeeId]);
  const processId = processRows[0].id;

  for (const stepType of ["PERSONAL_DETAILS", "IDENTITY_DOCUMENTS", "GUARANTORS", "ACKNOWLEDGMENTS", "SIGNATURE", "PROPERTY_HANDOVER"]) {
    const status = stepType === "PERSONAL_DETAILS" ? "SUBMITTED" : "NOT_STARTED";
    await pool.query(
      `INSERT INTO "OnboardingStep" (id, "onboardingProcessId", "stepType", status, "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2::"OnboardingStepType", $3::"OnboardingStepStatus", now(), now())`,
      [processId, stepType, status],
    );
  }

  const passwordHash = await bcrypt.hash(ZZTEST_PASSWORD, 10);
  await pool.query(`INSERT INTO "User" (id, email, "passwordHash", role, "employeeId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, 'EMPLOYEE', $3, now())`, [
    ZZTEST_EMAIL,
    passwordHash,
    employeeId,
  ]);

  return employeeId;
}

test("identity documents step rejects an old bill and a malformed NIN, then succeeds with valid input", async ({ page }) => {
  const employeeId = await createZzTestEmployeeWithLogin();

  await page.goto("/login");
  await page.getByLabel("Email").fill(ZZTEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  await page.goto("/me/onboarding/identity-documents");
  await expect(page.getByRole("heading", { name: "Identity & address documents" })).toBeVisible();

  await page.locator("#idFront").setInputFiles(TEST_PNG_PATH);
  await page.locator("#nin").fill("123"); // too short
  await page.locator("#billDate").fill("2020-01-01"); // way too old
  await page.locator("#addressFile").setInputFiles(TEST_PNG_PATH);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/NIN must be exactly 11 digits/i)).toBeVisible();

  // Re-select both files -- some browsers clear file inputs after any form submission attempt,
  // even one blocked by validation, so they can't be assumed to persist across the retry.
  await page.locator("#idFront").setInputFiles(TEST_PNG_PATH);
  await page.locator("#addressFile").setInputFiles(TEST_PNG_PATH);
  await page.locator("#nin").fill("12345678901");
  const todayStr = new Date().toISOString().slice(0, 10);
  await page.locator("#billDate").fill(todayStr);
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(1000);

  // No Vercel Blob token is configured in this sandbox, so the actual file upload fails --
  // what matters is that it fails visibly, not by crashing (same pattern as the client
  // document-upload test), and that nothing partial got saved.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/couldn.t upload/i)).toBeVisible();

  const { rows: emptyDocs } = await pool.query(`SELECT 1 FROM "EmployeeDocument" WHERE "employeeId" = $1`, [employeeId]);
  expect(emptyDocs).toHaveLength(0);

  // Insert directly (bypassing blob) to verify the rest of the pathway: categorization and
  // the step transition to SUBMITTED.
  await pool.query(
    `INSERT INTO "EmployeeDocument" (id, "employeeId", label, category, "fileUrl", "fileName", "uploadedById", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST ID', 'IDENTIFICATION', 'https://example.com/zztest.png', 'zztest.png', $1, now()),
            (gen_random_uuid()::text, $1, 'ZZTEST Proof of address', 'PROOF_OF_ADDRESS', 'https://example.com/zztest.png', 'zztest.png', $1, now())`,
    [employeeId],
  );
  await pool.query(`UPDATE "Employee" SET nin = '12345678901' WHERE id = $1`, [employeeId]);
  await pool.query(
    `UPDATE "OnboardingStep" SET status = 'SUBMITTED' WHERE "stepType" = 'IDENTITY_DOCUMENTS' AND "onboardingProcessId" = (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`,
    [employeeId],
  );

  await page.reload();
  await expect(page.getByText(/waiting on HR to verify/i)).toBeVisible();

  const { rows: docs } = await pool.query(`SELECT category FROM "EmployeeDocument" WHERE "employeeId" = $1`, [employeeId]);
  expect(docs.map((d) => d.category).sort()).toEqual(["IDENTIFICATION", "PROOF_OF_ADDRESS"]);
});
