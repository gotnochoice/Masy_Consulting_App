import { test, expect } from "@playwright/test";
import { CLIENT_LOGIN, OPS_LOGIN, pool } from "./helpers";

async function makeEmployeeWithIdDoc(status: "ACTIVE" | "OFFBOARDED", offboardedDaysAgo?: number) {
  const { rows: orgRows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const offboardedAt = offboardedDaysAgo != null ? `now() - interval '${offboardedDaysAgo} days'` : "NULL";
  const { rows: empRows } = await pool.query<{ id: string }>(
    `INSERT INTO "Employee" (id, "clientOrgId", name, "roleTitle", email, "startDate", status, "offboardedAt", nin, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Retention', 'ZZTEST Role', $2, now(), $3, ${offboardedAt}, '12345678901', now(), now())
     RETURNING id`,
    [orgRows[0].id, `zztest-retention-${Date.now()}@example.com`, status],
  );
  const employeeId = empRows[0].id;
  const { rows: docRows } = await pool.query<{ id: string }>(
    `INSERT INTO "EmployeeDocument" (id, "employeeId", label, category, "fileUrl", "fileName", "uploadedById", "createdAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST ID', 'IDENTIFICATION', 'https://example.com/zztest.png', 'zztest.png', $1, now())
     RETURNING id`,
    [employeeId],
  );
  return { employeeId, documentId: docRows[0].id };
}

async function cleanup(employeeId: string) {
  await pool.query(`DELETE FROM "AuditLog" WHERE "targetId" IN (SELECT id::text FROM "EmployeeDocument" WHERE "employeeId" = $1)`, [employeeId]);
  await pool.query(`DELETE FROM "AuditLog" WHERE "targetType" = 'Employee' AND "targetId" = $1`, [employeeId]);
  await pool.query(`DELETE FROM "EmployeeDocument" WHERE "employeeId" = $1`, [employeeId]);
  await pool.query(`DELETE FROM "Employee" WHERE id = $1`, [employeeId]);
}

test("ops can export one employee's data as JSON, with their NIN decrypted; a client and anonymous request cannot", async ({ page }) => {
  const { employeeId } = await makeEmployeeWithIdDoc("ACTIVE");
  try {
    const anonRes = await page.request.get(`/api/employees/${employeeId}/export`);
    expect(anonRes.status()).toBe(401);

    await page.goto("/login");
    await page.getByLabel("Email").fill(CLIENT_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(CLIENT_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/client\/staff/);
    const clientRes = await page.request.get(`/api/employees/${employeeId}/export`);
    expect(clientRes.status()).toBe(403);

    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(OPS_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/ops/);
    const opsRes = await page.request.get(`/api/employees/${employeeId}/export`);
    expect(opsRes.status()).toBe(200);
    const body = await opsRes.json();
    expect(body.nin).toBe("12345678901");
    expect(body.documents).toHaveLength(1);

    const { rows: logs } = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action = 'employee.data_export' AND "targetId" = $1`, [employeeId]);
    expect(logs.length).toBeGreaterThan(0);
  } finally {
    await cleanup(employeeId);
  }
});

test("ops can delete an employee's identity documents on request, ahead of the retention schedule", async ({ page }) => {
  const { employeeId, documentId } = await makeEmployeeWithIdDoc("ACTIVE");
  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OPS_LOGIN.email);
    await page.getByLabel("Password", { exact: true }).fill(OPS_LOGIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/ops/);

    await page.goto(`/ops/employees/${employeeId}/edit`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete identity documents now" }).click();
    await page.waitForTimeout(800);

    const { rows } = await pool.query(`SELECT 1 FROM "EmployeeDocument" WHERE id = $1`, [documentId]);
    expect(rows).toHaveLength(0);

    const { rows: logs } = await pool.query(`SELECT 1 FROM "AuditLog" WHERE action = 'employee_document.requested_delete' AND "targetId" = $1`, [documentId]);
    expect(logs.length).toBeGreaterThan(0);
  } finally {
    await cleanup(employeeId);
  }
});

test("the daily retention job deletes identity documents for employees offboarded over a year ago, and leaves recently-offboarded employees alone", async ({ page }) => {
  const expired = await makeEmployeeWithIdDoc("OFFBOARDED", 400);
  const recent = await makeEmployeeWithIdDoc("OFFBOARDED", 10);
  try {
    const res = await page.request.get("/api/cron/data-retention");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.documentsDeleted).toBeGreaterThanOrEqual(1);

    const { rows: expiredDocs } = await pool.query(`SELECT 1 FROM "EmployeeDocument" WHERE id = $1`, [expired.documentId]);
    expect(expiredDocs).toHaveLength(0);

    const { rows: recentDocs } = await pool.query(`SELECT 1 FROM "EmployeeDocument" WHERE id = $1`, [recent.documentId]);
    expect(recentDocs).toHaveLength(1);
  } finally {
    await cleanup(expired.employeeId);
    await cleanup(recent.employeeId);
  }
});
