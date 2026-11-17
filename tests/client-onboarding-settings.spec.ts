import { test, expect } from "@playwright/test";
import { CLIENT_LOGIN, pool } from "./helpers";

test.afterEach(async () => {
  await pool.query(
    `UPDATE "ClientOrg" SET "companyLegalName" = NULL, "companyAddress" = NULL, "signatoryName" = NULL,
     "signatoryTitle" = NULL, "employmentAgreementTemplate" = NULL, "handbookText" = NULL,
     "privacyNoticeText" = NULL, "onboardingContentReviewedAt" = NULL, "onboardingContentReviewedById" = NULL,
     "employmentAgreementVersion" = '1.0', "handbookVersion" = '1.0', "privacyNoticeVersion" = '1.0'
     WHERE slug = 'lagos-bites-catering'`,
  );
  await pool.query(
    `DELETE FROM "ComprehensionQuestion" WHERE "clientOrgId" = (SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering')`,
  );
});

async function loginAsClient(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CLIENT_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(CLIENT_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/client\/staff/);
}

test("client can set up the letterhead and save the employment agreement/handbook text directly", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/client/settings/onboarding");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Onboarding setup" })).toBeVisible();

  // Not reviewed yet -- the gate should say so and no agreement exists yet.
  await expect(page.getByText(/can.t start onboarding/i)).toBeVisible();

  await page.locator("#companyLegalName").fill("ZZTEST Lagos Bites Catering Ltd");
  await page.locator("#companyAddress").fill("ZZTEST 12 Admiralty Way, Lekki, Lagos");
  await page.locator("#signatoryName").fill("ZZTEST Founder Name");
  await page.locator("#signatoryTitle").fill("Founder");
  await page.getByRole("button", { name: "Save letterhead" }).click();
  await page.waitForTimeout(1000);

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.locator("#companyLegalName")).toHaveValue("ZZTEST Lagos Bites Catering Ltd");

  // Save the agreement and handbook by typing directly (bypassing AI, which needs no API key
  // configured in this environment) -- confirms the plain save path works end to end.
  const agreementTextarea = page.locator("textarea[name='text']").first();
  await agreementTextarea.fill(
    "ZZTEST Employment Agreement\n1. Position: Sales Associate.\n2. Hours: Shift A, 9am-5pm WAT, Monday to Friday.\n3. Pay: Monthly salary paid on the last working day. No bonus is guaranteed.\n4. Leave: 6 working days annual leave after 12 months.",
  );
  await page.getByRole("button", { name: "Save employment agreement" }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("Saved.").first()).toBeVisible();

  const { rows } = await pool.query<{ employmentAgreementTemplate: string | null; employmentAgreementVersion: string }>(
    `SELECT "employmentAgreementTemplate", "employmentAgreementVersion" FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`,
  );
  expect(rows[0].employmentAgreementTemplate).toContain("ZZTEST Employment Agreement");
  expect(rows[0].employmentAgreementVersion).toBe("1.1");
});

test("AI draft and quiz generation fail visibly, not by crashing, when no API key is configured", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/client/settings/onboarding");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Draft with AI" }).first().click();
  await page.locator("#payStructure").fill("ZZTEST monthly salary");
  await page.getByRole("button", { name: "Generate draft" }).first().click();
  await page.waitForTimeout(2000);

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  // No ANTHROPIC_API_KEY is configured in this sandbox, so this should surface as an inline
  // error rather than crash the page -- the same bug class flagged earlier this session.
  await expect(page.getByText(/ai suggestions aren.t set up|something went wrong drafting/i)).toBeVisible();
});

test("marking content reviewed is blocked until agreement, handbook, and quiz all exist", async ({ page }) => {
  await loginAsClient(page);
  await page.goto("/client/settings/onboarding");
  await page.waitForLoadState("networkidle");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /reviewed this, mark it ready/i }).click();
  await page.waitForTimeout(1000);

  // Nothing's saved yet, so the server-side guard should reject this -- check it didn't crash
  // and didn't silently mark it reviewed either.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  const { rows } = await pool.query<{ onboardingContentReviewedAt: Date | null }>(
    `SELECT "onboardingContentReviewedAt" FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`,
  );
  expect(rows[0].onboardingContentReviewedAt).toBeNull();
});
