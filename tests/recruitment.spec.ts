import { test, expect } from "@playwright/test";
import { OPS_LOGIN, findSeededRole, cleanupZzTestCandidates, pool } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OPS_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ops\/overview/);
});

test("ops can add a candidate manually and move their stage", async ({ page }) => {
  const role = await findSeededRole();
  await cleanupZzTestCandidates(role.id);

  await page.goto(`/ops/recruitment/${role.id}`);
  await page.getByText("+ Add a candidate manually").click();
  await page.getByLabel("Name").fill("ZZTEST Manual Candidate");
  await page.getByLabel("Email (optional)").fill("zztest-manual@example.com");
  await page.getByRole("button", { name: "Add candidate" }).click();

  await expect(page.getByRole("button", { name: "ZZTEST Manual Candidate" })).toBeVisible();

  const { rows } = await pool.query<{ id: string; stage: string }>(
    `SELECT id, stage FROM "Candidate" WHERE "openRoleId" = $1 AND name = $2`,
    [role.id, "ZZTEST Manual Candidate"],
  );
  expect(rows).toHaveLength(1);

  await page.locator(`#candidate-${rows[0].id}`).locator('select[name="stage"]').selectOption("SCREENING");
  await page.waitForLoadState("networkidle");

  const updated = await pool.query<{ stage: string }>(`SELECT stage FROM "Candidate" WHERE id = $1`, [rows[0].id]);
  expect(updated.rows[0].stage).toBe("SCREENING");

  await cleanupZzTestCandidates(role.id);
});
