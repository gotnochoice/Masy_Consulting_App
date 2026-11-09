import { test, expect } from "@playwright/test";
import { OPS_LOGIN, pool } from "./helpers";

// Regression test for the "exclude this role" filter on /ops/applicants: used when a role is
// reopened/recruited for again and Ops wants to see every applicant except the ones already
// tied to that specific role.
test.describe("applicants: exclude-role filter", () => {
  let roleAId: string;
  let roleBId: string;

  test.beforeAll(async () => {
    const { rows: orgRows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" LIMIT 1`);
    const clientOrgId = orgRows[0].id;

    const { rows: roleRows } = await pool.query<{ id: string }>(
      `INSERT INTO "OpenRole" (id, "clientOrgId", title, slug, "createdAt")
       VALUES
         (gen_random_uuid()::text, $1, 'ZZTEST Role A', 'zztest-role-a-' || floor(random()*1000000)::text, now()),
         (gen_random_uuid()::text, $1, 'ZZTEST Role B', 'zztest-role-b-' || floor(random()*1000000)::text, now())
       RETURNING id`,
      [clientOrgId],
    );
    roleAId = roleRows[0].id;
    roleBId = roleRows[1].id;

    await pool.query(
      `INSERT INTO "Candidate" (id, "openRoleId", name, email, stage, source, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid()::text, $1, 'ZZTEST Candidate A', 'zztest-exclude-a@example.com', 'APPLIED', 'WEBSITE', now(), now()),
         (gen_random_uuid()::text, $2, 'ZZTEST Candidate B', 'zztest-exclude-b@example.com', 'APPLIED', 'WEBSITE', now(), now())`,
      [roleAId, roleBId],
    );
  });

  test.afterAll(async () => {
    await pool.query(`DELETE FROM "Candidate" WHERE "openRoleId" = ANY($1)`, [[roleAId, roleBId]]);
    await pool.query(`DELETE FROM "OpenRole" WHERE id = ANY($1)`, [[roleAId, roleBId]]);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OPS_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/ops\/overview/);
  });

  test("excluding a role hides its candidates and shows everyone else's", async ({ page }) => {
    await page.goto(`/ops/applicants?roleId=${roleAId}&excludeRole=1`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("ZZTEST Candidate A")).toHaveCount(0);
    await expect(page.locator("table").getByText("ZZTEST Candidate B")).toBeVisible();
    await expect(page.getByText(/everyone except ZZTEST Role A/)).toBeVisible();
  });

  test("without the exclude checkbox, picking a role still filters to just that role", async ({ page }) => {
    await page.goto(`/ops/applicants?roleId=${roleAId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("table").getByText("ZZTEST Candidate A")).toBeVisible();
    await expect(page.getByText("ZZTEST Candidate B")).toHaveCount(0);
  });
});
