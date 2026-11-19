import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, pool } from "./helpers";

const AGREEMENT_TEXT = "ZZTEST Agreement for signing.";
const HANDBOOK_TEXT = "ZZTEST Handbook for signing.";

async function setUpOrgContent() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const clientOrgId = rows[0].id;
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = $1, "handbookText" = $2 WHERE id = $3`,
    [AGREEMENT_TEXT, HANDBOOK_TEXT, clientOrgId],
  );
  return clientOrgId;
}

async function tearDownOrgContent(clientOrgId: string) {
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = NULL, "handbookText" = NULL,
     "employmentAgreementVersion" = '1.0', "handbookVersion" = '1.0' WHERE id = $1`,
    [clientOrgId],
  );
}

test.afterEach(cleanupOnboardingTestEmployees);

test("signature step: drawing and typing a name signs each document and records an audit trail", async ({ page }) => {
  const clientOrgId = await setUpOrgContent();
  try {
    const email = "zztest.signature@example.com";
    const employeeId = await createOnboardingTestEmployee(email, {
      PERSONAL_DETAILS: "SUBMITTED",
      IDENTITY_DOCUMENTS: "SUBMITTED",
      GUARANTORS: "SUBMITTED",
      ACKNOWLEDGMENTS: "SUBMITTED",
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/me\/onboarding/);

    await page.goto("/me/onboarding/signature");
    await expect(page.getByText("Sign: Employment Agreement")).toBeVisible();

    // Submit without drawing a signature -- should reject inline, not crash.
    await page.locator("#typedName").fill("ZZTEST Signer");
    await page.locator("input[name='confirmLegal']").check();
    await page.getByRole("button", { name: "Sign", exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);
    await expect(page.getByText("Draw your signature above to sign.")).toBeVisible();

    async function drawSignature() {
      const canvas = page.locator("canvas");
      const box = await canvas.boundingBox();
      if (!box) throw new Error("canvas not found");
      await page.mouse.move(box.x + 20, box.y + 60);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 30);
      await page.mouse.move(box.x + 200, box.y + 80);
      await page.mouse.up();
    }

    await drawSignature();
    await page.locator("#typedName").fill("ZZTEST Signer");
    await page.locator("input[name='confirmLegal']").check();
    await page.getByRole("button", { name: "Sign", exact: true }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);

    // Handbook next
    await expect(page.getByText("Sign: Employee Handbook")).toBeVisible();
    await drawSignature();
    await page.locator("#typedName").fill("ZZTEST Signer");
    await page.locator("input[name='confirmLegal']").check();
    await page.getByRole("button", { name: "Sign", exact: true }).click();
    await page.waitForTimeout(1500);

    // Signing the second (and last) document completes the step and moves straight on.
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);
    await page.waitForURL(/\/me\/onboarding\/property-handover/);

    const { rows: sigs } = await pool.query<{ documentType: string; typedName: string; documentHash: string; ipAddress: string }>(
      `SELECT "documentType", "typedName", "documentHash", "ipAddress" FROM "ESignature" WHERE "employeeId" = $1 ORDER BY "documentType"`,
      [employeeId],
    );
    expect(sigs.map((s) => s.documentType)).toEqual(["EMPLOYMENT_AGREEMENT", "HANDBOOK"]);
    expect(sigs.every((s) => s.typedName === "ZZTEST Signer")).toBe(true);
    expect(sigs.every((s) => s.documentHash.length === 64)).toBe(true);

    const { rows: stepRows } = await pool.query<{ status: string }>(
      `SELECT status FROM "OnboardingStep" WHERE "stepType" = 'SIGNATURE' AND "onboardingProcessId" = (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`,
      [employeeId],
    );
    expect(stepRows[0].status).toBe("SUBMITTED");
  } finally {
    await tearDownOrgContent(clientOrgId);
  }
});
