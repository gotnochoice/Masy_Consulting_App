import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, OPS_LOGIN, pool } from "./helpers";

test.afterEach(cleanupOnboardingTestEmployees);

test("guarantors step rejects a duplicate second guarantor, then succeeds with two distinct ones", async ({ page }) => {
  const email = "zztest.guarantors@example.com";
  const employeeId = await createOnboardingTestEmployee(email, { PERSONAL_DETAILS: "SUBMITTED", IDENTITY_DOCUMENTS: "SUBMITTED" });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  await page.goto("/me/onboarding/guarantors");
  await expect(page.getByRole("heading", { name: "Guarantors" })).toBeVisible();

  await page.locator("#g1_name").fill("ZZTEST Guarantor One");
  await page.locator("#g1_relationship").fill("Uncle");
  await page.locator("#g1_phone").fill("08011111111");
  await page.locator("#g1_email").fill("g1@example.com");
  await page.locator("#g1_address").fill("1 Test Street, Lagos");
  await page.locator("input[name='g1_consent']").check();

  // Same phone number as guarantor 1 -- should be rejected as a duplicate person.
  await page.locator("#g2_name").fill("ZZTEST Guarantor Two");
  await page.locator("#g2_relationship").fill("Aunt");
  await page.locator("#g2_phone").fill("08011111111");
  await page.locator("#g2_email").fill("g2@example.com");
  await page.locator("#g2_address").fill("2 Test Street, Lagos");
  await page.locator("input[name='g2_consent']").check();

  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/must be different people/i)).toBeVisible();

  // Both consent checkboxes are controlled React state, not uncontrolled defaultChecked --
  // they must survive the failed submission rather than silently uncheck themselves (React
  // resets uncontrolled form fields when a form action completes, error or not).
  await expect(page.locator("input[name='g1_consent']")).toBeChecked();
  await expect(page.locator("input[name='g2_consent']")).toBeChecked();

  // Only the duplicate phone number needs fixing -- nothing else should need re-entry.
  await page.locator("#g2_phone").fill("08022222222");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);

  // Guarantors is currently out of the compulsory onboarding sequence (see
  // ONBOARDING_STEP_ORDER), so a successful submit goes back to the overview rather than to a
  // "next step" within this sequence.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await page.waitForURL(/\/me\/onboarding$/);

  const { rows: guarantors } = await pool.query<{ name: string }>(
    `SELECT name FROM "Guarantor" WHERE "employeeId" = $1 ORDER BY "createdAt"`,
    [employeeId],
  );
  expect(guarantors.map((g) => g.name)).toEqual(["ZZTEST Guarantor One", "ZZTEST Guarantor Two"]);
});

test("only one next-of-kin contact is required when no equipment is being issued", async ({ page }) => {
  const email = "zztest.guarantors.noequip@example.com";
  const employeeId = await createOnboardingTestEmployee(email, { PERSONAL_DETAILS: "SUBMITTED", IDENTITY_DOCUMENTS: "SUBMITTED" });
  await pool.query(
    `INSERT INTO "CompanyAsset" (id, "employeeId", "itemType", status, "createdById", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'NO_EQUIPMENT_ISSUED', 'ISSUED', (SELECT id FROM "User" WHERE email = $2), now(), now())`,
    [employeeId, OPS_LOGIN.email],
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me\/onboarding/);

  await page.goto("/me/onboarding/guarantors");
  await expect(page.getByRole("heading", { name: "Next of kin" })).toBeVisible();
  await expect(page.locator("#g2_name")).toHaveCount(0);

  await page.locator("#g1_name").fill("ZZTEST Next Of Kin");
  await page.locator("#g1_relationship").fill("Sister");
  await page.locator("#g1_phone").fill("08099999999");
  await page.locator("#g1_email").fill("nok@example.com");
  await page.locator("#g1_address").fill("9 Test Street, Lagos");
  await page.locator("input[name='g1_consent']").check();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForTimeout(800);

  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await page.waitForURL(/\/me\/onboarding$/);

  const { rows: guarantors } = await pool.query<{ name: string }>(
    `SELECT name FROM "Guarantor" WHERE "employeeId" = $1`,
    [employeeId],
  );
  expect(guarantors.map((g) => g.name)).toEqual(["ZZTEST Next Of Kin"]);
});
