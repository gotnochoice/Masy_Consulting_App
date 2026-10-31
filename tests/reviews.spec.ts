import { test, expect } from "@playwright/test";
import { EMPLOYEE_LOGIN, pool } from "./helpers";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);
}

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

  // Fill every required question except the last, which is submitted empty by bypassing
  // its `required` attribute -- the server must reject it, not the browser.
  const textareas = page.locator("textarea[required]");
  const count = await textareas.count();
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      await textareas.nth(i).evaluate((el) => el.removeAttribute("required"));
    } else {
      await textareas.nth(i).fill("A detailed, specific answer with real substance for testing.");
    }
  }

  await page.locator('form:has(#cycle) button[type="submit"]').click();

  await expect(page.getByText(/Please answer/)).toBeVisible();
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText("Submit a self-assessment")).toBeVisible();
  await expect(page).toHaveURL(/\/me\/reviews/);
});

test("a fully-answered review submission succeeds and shows up in the list", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);

  await page.goto("/me/reviews");
  await page.waitForLoadState("networkidle");

  const cycleName = `ZZTEST Cycle ${Date.now()}`;
  await page.locator("#cycle").fill(cycleName);
  const textareas = page.locator("textarea[required]");
  const count = await textareas.count();
  for (let i = 0; i < count; i++) {
    await textareas.nth(i).fill("A detailed, specific answer with real substance for testing purposes, covering concrete examples.");
  }

  await page.locator('form:has(#cycle) button[type="submit"]').click();
  await page.waitForURL(/done=/, { timeout: 15000 });

  await expect(page.getByText("Review submitted")).toBeVisible();
  await expect(page.getByText(cycleName)).toBeVisible();

  await pool.query(`DELETE FROM "PerformanceReview" WHERE cycle = $1`, [cycleName]);
});
