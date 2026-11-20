import { test, expect, type Page } from "@playwright/test";
import { EMPLOYEE_LOGIN, pool } from "./helpers";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);
}

// Per-question textareas are named s{section}_q{question}; the optional self-assessment
// box is excluded since it isn't one of the template's questions.
function questionTextareas(page: Page) {
  return page.locator('form:has(#cycle) textarea:not(#selfAssessment)');
}

test.afterEach(async () => {
  await pool.query(`DELETE FROM "PerformanceReview" WHERE cycle LIKE 'ZZTEST%'`);
});

// Regression test: submitReview used to throw plain Errors (missing fields, the AI quality
// check) from a server action bound directly to the form with no useActionState -- any
// thrown error crashed the whole page instead of showing the employee what to fix. A real
// submission was silently lost this way. This confirms the action now returns an error the
// form displays inline, and the page itself never breaks.
test("a rejected review submission shows an inline error, not a crashed page", async ({ page }) => {
  await login(page);

  await page.goto("/me/reviews");
  await page.waitForLoadState("networkidle");

  await page.locator("#cycle").fill("ZZTEST Cycle");

  // Fill every question except the last, which is submitted empty -- the server must
  // reject it with "Please answer: ...".
  const textareas = questionTextareas(page);
  const count = await textareas.count();
  for (let i = 0; i < count - 1; i++) {
    await textareas.nth(i).fill("A detailed, specific answer with real substance for testing.");
  }

  await page.locator('form:has(#cycle) button[type="submit"]').first().click();

  await expect(page.getByText(/Please answer/)).toBeVisible();
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("Submit a self-assessment")).toBeVisible();
  await expect(page).toHaveURL(/\/me\/reviews/);
});

test("a fully-answered review submission succeeds and shows up in the list", async ({ page }) => {
  await login(page);

  await page.goto("/me/reviews");
  await page.waitForLoadState("networkidle");

  const cycleName = `ZZTEST Cycle ${Date.now()}`;
  await page.locator("#cycle").fill(cycleName);
  const textareas = questionTextareas(page);
  const count = await textareas.count();
  for (let i = 0; i < count; i++) {
    await textareas.nth(i).fill("A detailed, specific answer with real substance for testing purposes, covering concrete examples.");
  }

  await page.locator('form:has(#cycle) button[type="submit"]').first().click();
  await page.waitForURL(/done=/, { timeout: 15000 });

  await expect(page.getByText("Review submitted")).toBeVisible();
  await expect(page.getByText(cycleName)).toBeVisible();
});

test("saving a draft persists partial answers across a reload and never reaches Ops", async ({ page }) => {
  await login(page);

  await page.goto("/me/reviews");
  await page.waitForLoadState("networkidle");

  const cycleName = `ZZTEST Draft ${Date.now()}`;
  await page.locator("#cycle").fill(cycleName);
  const textareas = questionTextareas(page);
  // Only partially answer -- a draft must accept incomplete input.
  await textareas.first().fill("A partial answer, still in progress.");

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();

  // The draft must never behave like a real submission.
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page).toHaveURL(/\/me\/reviews/);

  await page.reload();
  await page.waitForLoadState("networkidle");

  await expect(page.locator("#cycle")).toHaveValue(cycleName);
  await expect(questionTextareas(page).first()).toHaveValue("A partial answer, still in progress.");
  await expect(page.getByText("Picking up a saved draft")).toBeVisible();

  const { rows } = await pool.query(`SELECT status FROM "PerformanceReview" WHERE cycle = $1`, [cycleName]);
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe("DRAFT");
});
