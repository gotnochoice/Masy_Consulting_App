import { test, expect } from "@playwright/test";
import { OPS_LOGIN, findSeededRole, cleanupZzTestCandidates, countCandidates, pool } from "./helpers";

const SEED_COUNT = 65;

test.describe("applicants pagination and pipeline board capping", () => {
  let roleId: string;
  let totalCount: number;

  test.beforeAll(async () => {
    const role = await findSeededRole();
    roleId = role.id;
    await cleanupZzTestCandidates(roleId);

    const values: string[] = [];
    const params: string[] = [];
    for (let i = 0; i < SEED_COUNT; i++) {
      const base = i * 3;
      values.push(`(gen_random_uuid()::text, $${base + 1}, $${base + 2}, $${base + 3}, 'APPLIED', 'WEBSITE', now(), now())`);
      params.push(roleId, `ZZTEST Candidate ${i}`, `zztest-page-${i}@example.com`);
    }
    await pool.query(
      `INSERT INTO "Candidate" (id, "openRoleId", name, email, stage, source, "createdAt", "updatedAt")
       VALUES ${values.join(", ")}`,
      params,
    );
    totalCount = await countCandidates(roleId);
  });

  test.afterAll(async () => {
    await cleanupZzTestCandidates(roleId);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OPS_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/ops\/overview/);
  });

  test("applicants list paginates at 50 and keeps full-match counts across pages", async ({ page }) => {
    await page.goto(`/ops/applicants?roleId=${roleId}`);
    await expect(page.getByText(/page 1 of 2/)).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(50);

    const nextHref = await page.locator('a[href*="page=2"]').first().getAttribute("href");
    await page.goto(nextHref!);
    await expect(page.locator("table tbody tr")).toHaveCount(totalCount - 50);

    await expect(page.getByRole("button", { name: /Copy \d+ emails?/ })).toBeVisible();
  });

  test("pipeline board caps a column at 30 and links to the rest in Applicants", async ({ page }) => {
    await page.goto(`/ops/recruitment/${roleId}`);
    const moreLink = page.getByRole("link", { name: /more -- view all in Applicants/ });
    await expect(moreLink).toBeVisible();
    await expect(moreLink).toHaveAttribute("href", `/ops/applicants?roleId=${roleId}&stage=APPLIED`);

    await moreLink.click();
    await expect(page.getByText(/page 1 of 2/)).toBeVisible();
  });
});
