import { test, expect } from "@playwright/test";
import { EMPLOYEE_LOGIN, pool } from "./helpers";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_LOGIN.email);
  await page.getByLabel("Password", { exact: true }).fill(EMPLOYEE_LOGIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/me/);
}

async function getEmployeeId(): Promise<string> {
  const { rows } = await pool.query<{ employeeId: string }>(
    `SELECT "employeeId" FROM "User" WHERE email = $1`,
    [EMPLOYEE_LOGIN.email],
  );
  return rows[0].employeeId;
}

test.beforeEach(async () => {
  const employeeId = await getEmployeeId();
  await pool.query(`DELETE FROM "AttendanceRecord" WHERE "employeeId" = $1`, [employeeId]);
});

test.afterAll(async () => {
  const employeeId = await getEmployeeId();
  await pool.query(`DELETE FROM "AttendanceRecord" WHERE "employeeId" = $1`, [employeeId]);
});

test("employee can clock out mid-day with a reason, then clock back in the same day", async ({ page }) => {
  await login(page);
  await page.goto("/me/attendance");
  await page.waitForLoadState("networkidle");

  // Clock in for the day.
  await page.locator("#note").fill("ZZTEST working on reports");
  await page.getByRole("button", { name: "Clock in" }).click();
  await page.waitForURL(/done=/);

  await expect(page.getByText(/Currently clocked in/)).toBeVisible();

  // Step away from the desk with a reason.
  await page.locator("#note").fill("ZZTEST stepping out for a doctor's appointment");
  await page.getByRole("button", { name: "Clock out" }).click();
  await page.waitForURL(/done=/);

  await expect(page.getByRole("button", { name: "Clock back in" })).toBeVisible();
  await expect(page.getByText(/ZZTEST stepping out for a doctor's appointment/).first()).toBeVisible();

  // Clock back in for the rest of the day.
  await page.locator("#note").fill("ZZTEST back and resuming reports");
  await page.getByRole("button", { name: "Clock back in" }).click();
  await page.waitForURL(/done=/);

  await expect(page.getByText(/Currently clocked in/)).toBeVisible();

  // Today's session list should show both sessions.
  const employeeId = await getEmployeeId();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM "AttendanceRecord" WHERE "employeeId" = $1`,
    [employeeId],
  );
  expect(rows).toHaveLength(1);
  const { rows: sessionRows } = await pool.query(
    `SELECT "clockIn", "clockOut", "clockInNote", "clockOutNote" FROM "AttendanceSession"
     WHERE "attendanceRecordId" = $1 ORDER BY "clockIn" ASC`,
    [rows[0].id],
  );
  expect(sessionRows).toHaveLength(2);
  expect(sessionRows[0].clockOut).not.toBeNull();
  expect(sessionRows[0].clockOutNote).toContain("doctor's appointment");
  expect(sessionRows[1].clockOut).toBeNull();
  expect(sessionRows[1].clockInNote).toContain("back and resuming");

  // The day's outer summary record should reflect "currently clocked in" (clockOut null),
  // matching the open second session, not the closed first one.
  const { rows: recordRows } = await pool.query(
    `SELECT "clockOut" FROM "AttendanceRecord" WHERE id = $1`,
    [rows[0].id],
  );
  expect(recordRows[0].clockOut).toBeNull();
});
