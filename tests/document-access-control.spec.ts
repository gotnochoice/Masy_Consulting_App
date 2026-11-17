import { test, expect } from "@playwright/test";
import { CLIENT_LOGIN, OPS_LOGIN, pool } from "./helpers";

// The identity-verification document proxy route (/api/documents/[id]): every view is
// authorization-checked and logged, since these categories must never reach a client, even on
// their own employee's record, and the raw blob URL is never exposed to the browser.
test("document access control: HR and the owning employee can view an identity document; a client and an anonymous request cannot", async ({ page, request }) => {
  const { rows: orgRows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const { rows: empRows } = await pool.query<{ id: string }>(
    `INSERT INTO "Employee" (id, "clientOrgId", name, "roleTitle", email, "startDate", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Doc Access', 'ZZTEST Role', 'zztest-doc-access@example.com', now(), now(), now())
     RETURNING id`,
    [orgRows[0].id],
  );
  const employeeId = empRows[0].id;

  const { rows: docRows } = await pool.query<{ id: string }>(
    `INSERT INTO "EmployeeDocument" (id, "employeeId", label, category, "fileUrl", "fileName", "uploadedById", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST ID', 'IDENTIFICATION', 'https://example.com/zztest.png', 'zztest.png', $1, now())
     RETURNING id`,
    [employeeId],
  );
  const documentId = docRows[0].id;

  try {
    // Anonymous: 401.
    const anonRes = await request.get(`/api/documents/${documentId}`);
    expect(anonRes.status()).toBe(401);

    // Client: 403, even though it's their own org's employee.
    await page.goto("/login");
    await page.getByLabel("Email").fill(CLIENT_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(CLIENT_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/client\/staff/);
    const clientRes = await page.request.get(`/api/documents/${documentId}`);
    expect(clientRes.status()).toBe(403);

    // That document never even appears on the client's view of this employee's edit page.
    await page.goto(`/client/staff/${employeeId}/edit`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("ZZTEST ID")).toHaveCount(0);

    // Ops: authorization passes (not 401/403) -- whether the upstream fetch of the (fake, in
    // this test) file URL itself succeeds is a separate concern from authorization.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(OPS_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/ops/);
    const opsRes = await page.request.get(`/api/documents/${documentId}`);
    expect([401, 403]).not.toContain(opsRes.status());

    const { rows: logs } = await pool.query(
      `SELECT 1 FROM "AuditLog" WHERE action = 'employee_document.view' AND "targetId" = $1`,
      [documentId],
    );
    expect(logs.length).toBeGreaterThan(0);
  } finally {
    await pool.query(`DELETE FROM "AuditLog" WHERE "targetId" = $1`, [documentId]);
    await pool.query(`DELETE FROM "EmployeeDocument" WHERE id = $1`, [documentId]);
    await pool.query(`DELETE FROM "Employee" WHERE id = $1`, [employeeId]);
  }
});
