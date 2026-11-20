import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, ZZTEST_ONBOARDING_PASSWORD, pool } from "./helpers";

const AGREEMENT_TEXT = "ZZTEST Employment Agreement\n\n" + "Clause text. ".repeat(200) + "\n\nEnd of agreement.";
const HANDBOOK_TEXT = "ZZTEST Handbook\n\n" + "Handbook text. ".repeat(200) + "\n\nEnd of handbook.";
const PRIVACY_TEXT = "ZZTEST Privacy Notice\n\n" + "Privacy text. ".repeat(50) + "\n\nEnd of notice.";

async function setUpReviewedOrgContent() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const clientOrgId = rows[0].id;
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = $1, "handbookText" = $2, "privacyNoticeText" = $3,
     "onboardingContentReviewedAt" = now(), "onboardingContentReviewedById" = 'zztest' WHERE id = $4`,
    [AGREEMENT_TEXT, HANDBOOK_TEXT, PRIVACY_TEXT, clientOrgId],
  );
  await pool.query(
    `INSERT INTO "ComprehensionQuestion" (id, "clientOrgId", question, choices, "correctChoiceIndex", explanation, "order", "createdAt")
     VALUES
       (gen_random_uuid()::text, $1, 'ZZTEST: what is this agreement for', ARRAY['Testing','Nothing','A game','Unknown'], 0, 'It is a test agreement.', 0, now()),
       (gen_random_uuid()::text, $1, 'ZZTEST: second question', ARRAY['A','B','C','D'], 2, 'C is correct for this test.', 1, now())`,
    [clientOrgId],
  );
  return clientOrgId;
}

// Content is fully set up, but the client never clicked "I've reviewed this, mark it ready" on
// their settings page. That flag is a reminder for the client, not a gate on the employee --
// this is the exact scenario a real client hit in production.
async function setUpUnreviewedOrgContent() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const clientOrgId = rows[0].id;
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = $1, "handbookText" = $2, "privacyNoticeText" = $3,
     "onboardingContentReviewedAt" = NULL, "onboardingContentReviewedById" = NULL WHERE id = $4`,
    [AGREEMENT_TEXT, HANDBOOK_TEXT, PRIVACY_TEXT, clientOrgId],
  );
  await pool.query(
    `INSERT INTO "ComprehensionQuestion" (id, "clientOrgId", question, choices, "correctChoiceIndex", explanation, "order", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST: what is this agreement for', ARRAY['Testing','Nothing','A game','Unknown'], 0, 'It is a test agreement.', 0, now())`,
    [clientOrgId],
  );
  return clientOrgId;
}

async function setUpReviewedOrgWithNothing() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const clientOrgId = rows[0].id;
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = NULL, "handbookText" = NULL,
     "onboardingContentReviewedAt" = now(), "onboardingContentReviewedById" = 'zztest' WHERE id = $1`,
    [clientOrgId],
  );
  return clientOrgId;
}

async function tearDownOrgContent(clientOrgId: string) {
  await pool.query(`DELETE FROM "ComprehensionQuestion" WHERE "clientOrgId" = $1`, [clientOrgId]);
  await pool.query(
    `UPDATE "ClientOrg" SET "employmentAgreementTemplate" = NULL, "handbookText" = NULL, "privacyNoticeText" = NULL,
     "employmentAgreementVersion" = '1.0', "handbookVersion" = '1.0', "privacyNoticeVersion" = '1.0',
     "onboardingContentReviewedAt" = NULL, "onboardingContentReviewedById" = NULL WHERE id = $1`,
    [clientOrgId],
  );
}

test.afterEach(cleanupOnboardingTestEmployees);

test("acknowledgments step: scroll-gated documents, key terms, and a quiz retry before passing", async ({ page }) => {
  const clientOrgId = await setUpReviewedOrgContent();
  try {
    const email = "zztest.acks@example.com";
    const employeeId = await createOnboardingTestEmployee(email, {
      PERSONAL_DETAILS: "SUBMITTED",
      IDENTITY_DOCUMENTS: "SUBMITTED",
      GUARANTORS: "SUBMITTED",
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/me\/onboarding/);

    await page.goto("/me/onboarding/acknowledgments");
    await expect(page.getByRole("heading", { name: "Agreement, handbook & quiz" })).toBeVisible();
    await expect(page.getByText("ZZTEST Employment Agreement")).toBeVisible();

    // Continue button should be disabled until scrolled to the end.
    const continueBtn = page.getByRole("button", { name: /I've read this/i });
    await expect(continueBtn).toBeDisabled();
    await page.locator("div.overflow-y-auto").first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();
    await page.waitForTimeout(500);

    // Handbook
    await expect(page.getByText("ZZTEST Handbook")).toBeVisible();
    await page.locator("div.overflow-y-auto").first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByRole("button", { name: /I've read this/i }).click();
    await page.waitForTimeout(500);

    // Privacy notice
    await expect(page.getByText("ZZTEST Privacy Notice")).toBeVisible();
    await page.locator("div.overflow-y-auto").first().evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.getByRole("button", { name: /I've read this/i }).click();
    await page.waitForTimeout(500);

    // Key terms
    await expect(page.getByText("Acknowledgment of key terms")).toBeVisible();
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) await checkboxes.nth(i).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(500);

    // Quiz -- answer the first question wrong on purpose, confirm it's rejected with an
    // explanation, then retry correctly.
    await expect(page.getByText("Quick comprehension check")).toBeVisible();
    await page.locator('input[name^="q_"][value="1"]').first().check();
    await page.locator('input[value="2"]').nth(1).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await page.waitForTimeout(800);
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);
    await expect(page.getByText(/not quite/i)).toBeVisible();

    // Re-select the correct answers by position (0 for q1, index 2 of q2's 4 choices = overall index 6).
    await page.locator('input[type="radio"]').nth(0).check(); // q1 choice index 0
    await page.locator('input[type="radio"]').nth(6).check(); // q2 choice index 2 (4 choices per question)
    await page.getByRole("button", { name: "Submit answers" }).click();
    await page.waitForTimeout(800);

    // Passing the quiz completes the step and moves straight on to the next one.
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);
    await page.waitForURL(/\/me\/onboarding\/signature/);

    const { rows: stepRows } = await pool.query<{ status: string }>(
      `SELECT status FROM "OnboardingStep" WHERE "stepType" = 'ACKNOWLEDGMENTS' AND "onboardingProcessId" = (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`,
      [employeeId],
    );
    expect(stepRows[0].status).toBe("SUBMITTED");

    const { rows: attempts } = await pool.query(`SELECT passed FROM "ComprehensionAttempt" WHERE "employeeId" = $1 ORDER BY "attemptedAt"`, [employeeId]);
    expect(attempts.map((a) => a.passed)).toEqual([false, true]);

    const { rows: termCount } = await pool.query(`SELECT count(*) FROM "KeyTermAcknowledgment" WHERE "employeeId" = $1`, [employeeId]);
    expect(Number(termCount[0].count)).toBe(11);
  } finally {
    await tearDownOrgContent(clientOrgId);
  }
});

test("acknowledgments step skips the agreement, handbook, and quiz entirely when a client hasn't set any of them up", async ({ page }) => {
  const clientOrgId = await setUpReviewedOrgWithNothing();
  try {
    const email = "zztest.acks.minimal@example.com";
    const employeeId = await createOnboardingTestEmployee(email, {
      PERSONAL_DETAILS: "SUBMITTED",
      IDENTITY_DOCUMENTS: "SUBMITTED",
      GUARANTORS: "SUBMITTED",
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/me\/onboarding/);

    await page.goto("/me/onboarding/acknowledgments");
    // Nothing was saved -- agreement, handbook, and privacy notice are all empty on this
    // client, and none of them have an app-wide fallback here (the client settings page shows
    // a suggested default privacy notice, but it isn't saved unless the client saves it) -- so
    // the flow goes straight to key terms, skipping every document panel.
    await expect(page.getByText("ZZTEST Employment Agreement")).toHaveCount(0);

    // Key terms -- the first and last step, since nothing else was set up.
    await expect(page.getByText("Acknowledgment of key terms")).toBeVisible();
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) await checkboxes.nth(i).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(800);

    // Completing key terms alone finishes the step and moves on -- no dead-end "no quiz set up"
    // error, and no requirement to have an agreement or handbook either. This client has no
    // agreement/handbook configured either, so the signature step (also skippable when nothing's
    // set up) auto-completes in turn and lands straight back on the overview.
    await expect(page.getByText("This page couldn't load")).toHaveCount(0);
    await page.waitForURL(/\/me\/onboarding$/);

    const { rows: stepRows } = await pool.query<{ status: string }>(
      `SELECT status FROM "OnboardingStep" WHERE "stepType" = 'ACKNOWLEDGMENTS' AND "onboardingProcessId" = (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`,
      [employeeId],
    );
    expect(stepRows[0].status).toBe("SUBMITTED");

    const { rows: attempts } = await pool.query(`SELECT count(*) FROM "ComprehensionAttempt" WHERE "employeeId" = $1`, [employeeId]);
    expect(Number(attempts[0].count)).toBe(0);
  } finally {
    await tearDownOrgContent(clientOrgId);
  }
});

test("acknowledgments step shows the actual content even when the client hasn't clicked \"mark it ready\" yet", async ({ page }) => {
  const clientOrgId = await setUpUnreviewedOrgContent();
  try {
    const email = "zztest.acks.unreviewed@example.com";
    await createOnboardingTestEmployee(email, {
      PERSONAL_DETAILS: "SUBMITTED",
      IDENTITY_DOCUMENTS: "SUBMITTED",
      GUARANTORS: "SUBMITTED",
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(ZZTEST_ONBOARDING_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/me\/onboarding/);

    await page.goto("/me/onboarding/acknowledgments");
    // "onboardingContentReviewedAt" is a reminder on the client's own settings page, not a gate
    // on the employee -- this must show the real agreement text, not the "employer hasn't
    // finished setting up onboarding content yet" placeholder.
    await expect(page.getByText(/employer hasn.t finished setting up/i)).toHaveCount(0);
    await expect(page.getByText("ZZTEST Employment Agreement")).toBeVisible();
  } finally {
    await tearDownOrgContent(clientOrgId);
  }
});
