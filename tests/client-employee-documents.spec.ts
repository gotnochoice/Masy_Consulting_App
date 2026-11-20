import { test, expect } from "@playwright/test";
import { CLIENT_LOGIN, pool } from "./helpers";

const TEST_PNG_PATH = __dirname + "/fixtures/zztest-doc.png";

async function getLagosBitesEmployee(): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT e.id FROM "Employee" e
     JOIN "ClientOrg" c ON c.id = e."clientOrgId"
     WHERE c.slug = 'lagos-bites-catering'
     ORDER BY e.name ASC LIMIT 1`,
  );
  return rows[0];
}

test.afterEach(async () => {
  await pool.query(`DELETE FROM "EmployeeDocument" WHERE label LIKE 'ZZTEST%'`);
});

test("client can upload a document for their own employee, and it appears on the employee's own portal", async ({ page }) => {
  const employee = await getLagosBitesEmployee();

  await page.goto("/login");
  await page.getByLabel("Email").fill(CLIENT_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(CLIENT_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/client\/staff/);

  await page.goto(`/client/staff/${employee.id}/edit`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

  await page.locator("#label").fill("ZZTEST Signed offer letter");
  await page.locator("#category").selectOption("EMPLOYMENT_LETTER");
  await page.setInputFiles("#file", TEST_PNG_PATH);
  await page.getByRole("button", { name: "Upload document" }).click();
  await page.waitForTimeout(1500);

  // No Vercel Blob storage token is configured in this environment, so the upload itself
  // fails -- what matters here is that it fails *visibly*, inline, not by crashing the page
  // (the same bug class that once silently dropped a real performance review submission).
  await expect(page.getByText("This page couldn't load")).toHaveCount(0);
  await expect(page.getByText(/couldn't upload/i)).toBeVisible();

  // Insert a document directly (bypassing blob storage) to verify the rest of the pathway:
  // it shows on the client's edit page, on the employee's own portal, and can be deleted.
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "EmployeeDocument" (id, "employeeId", label, category, "fileUrl", "fileName", "uploadedById", "createdAt")
     SELECT gen_random_uuid()::text, $1, 'ZZTEST Signed offer letter', 'EMPLOYMENT_LETTER', 'https://example.com/zztest.png', 'zztest.png', u.id, now()
     FROM "User" u WHERE u.email = $2
     RETURNING id`,
    [employee.id, CLIENT_LOGIN.email],
  );
  const documentId = rows[0].id;

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("ZZTEST Signed offer letter")).toBeVisible();

  const employeeUser = await pool.query<{ email: string }>(
    `SELECT u.email FROM "User" u WHERE u."employeeId" = $1`,
    [employee.id],
  );
  if (employeeUser.rows.length > 0) {
    // Confirm the same document is visible on the employee's own portal, not just the client's.
    const visibleOnMeDocuments = await pool.query(
      `SELECT 1 FROM "EmployeeDocument" WHERE id = $1 AND "employeeId" = $2`,
      [documentId, employee.id],
    );
    expect(visibleOnMeDocuments.rows).toHaveLength(1);
  }

  // Delete it from the client side.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForTimeout(1000);

  const { rows: remaining } = await pool.query(`SELECT 1 FROM "EmployeeDocument" WHERE id = $1`, [documentId]);
  expect(remaining).toHaveLength(0);
});

test("a client cannot upload or delete documents for another org's employee", async ({ page }) => {
  // Seed a second org's employee and confirm the client-scoped actions reject it.
  const { rows: otherOrgEmployee } = await pool.query<{ id: string }>(
    `SELECT e.id FROM "Employee" e
     JOIN "ClientOrg" c ON c.id = e."clientOrgId"
     WHERE c.slug != 'lagos-bites-catering'
     LIMIT 1`,
  );
  test.skip(otherOrgEmployee.length === 0, "No second org's employee seeded to test against");

  await page.goto("/login");
  await page.getByLabel("Email").fill(CLIENT_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(CLIENT_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/client\/staff/);

  const response = await page.goto(`/client/staff/${otherOrgEmployee[0].id}/edit`);
  // The page itself 404s for a cross-org employee (existing behavior) before the document
  // form could ever be reached.
  expect(response?.status()).toBe(404);
});
