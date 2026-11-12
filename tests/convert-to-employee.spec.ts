import { test, expect } from "@playwright/test";
import { OPS_LOGIN, findSeededRole, pool } from "./helpers";

// Regression test: "Convert to employee" only existed on the recruitment pipeline board's
// candidate card, not on the separate /ops/applicants/[id] detail page -- a hired candidate
// viewed from there had no way to create an onboarding record at all.
test("a hired candidate can be converted to an employee from the applicant detail page", async ({ page }) => {
  const role = await findSeededRole();
  const email = "zztest-hired-detail@example.com";
  await pool.query(`DELETE FROM "Candidate" WHERE "openRoleId" = $1 AND email = $2`, [role.id, email]);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Candidate" (id, "openRoleId", name, email, stage, source, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Hired Candidate', $2, 'HIRED', 'WEBSITE', now(), now())
     RETURNING id`,
    [role.id, email],
  );
  const candidateId = rows[0].id;

  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops\/overview/);

  await page.goto(`/ops/applicants/${candidateId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("button", { name: "Create employee record" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toHaveValue(email);

  await page.getByRole("button", { name: "Create employee record" }).click();
  await expect(page.getByText(/Employee record created|View employee record/)).toBeVisible();

  const { rows: employeeRows } = await pool.query(
    `SELECT e.id FROM "Employee" e JOIN "Candidate" c ON c."convertedEmployeeId" = e.id WHERE c.id = $1`,
    [candidateId],
  );
  expect(employeeRows).toHaveLength(1);

  await pool.query(`DELETE FROM "OnboardingTask" WHERE "employeeId" = $1`, [employeeRows[0].id]);
  await pool.query(`DELETE FROM "Candidate" WHERE id = $1`, [candidateId]);
  await pool.query(`DELETE FROM "Employee" WHERE id = $1`, [employeeRows[0].id]);
});
