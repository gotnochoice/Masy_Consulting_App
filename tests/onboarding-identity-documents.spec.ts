import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, pool } from "./helpers";

const ZZTEST_EMAIL = "zztest.iddocs@example.com";
const TEST_PNG_PATH = __dirname + "/fixtures/zztest-doc.png";

test.afterEach(cleanupOnboardingTestEmployees);

test("identity documents step rejects an old bill and a malformed NIN, then succeeds with valid input", async ({ page }) => {
  const employeeId = await createOnboardingTestEmployee(ZZTEST_EMAIL, { PERSONAL_DETAILS: "SUBMITTED" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(ZZTEST_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
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

  // The files already selected (and the bill date) must survive this failed submission --
  // only the actual mistake (the NIN) needs fixing. This form dispatches manually rather than
  // via <form action={fn}>, specifically to avoid React's native form.reset() on settle, which
  // used to wipe everything here on every failed retry.
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
