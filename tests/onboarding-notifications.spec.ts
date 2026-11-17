import { test, expect } from "@playwright/test";
import { createOnboardingTestEmployee, cleanupOnboardingTestEmployees, pool } from "./helpers";

// No RESEND_API_KEY is configured in this environment, so email delivery itself can't be
// asserted here -- these confirm the observable, database-level side effects of each trigger
// instead (the idempotency log, the digest query not crashing), the same way the rest of this
// app's optional-integration tests work around a missing AI/Paystack/Blob key.

test("commencement reminders: sent exactly once per day-mark, for employees within the window", async () => {
  const inWindowEmail = `zztest-reminder-in-${Date.now()}@example.com`;
  const outOfWindowEmail = `zztest-reminder-out-${Date.now()}@example.com`;
  const inWindowId = await createOnboardingTestEmployee(inWindowEmail);
  const outOfWindowId = await createOnboardingTestEmployee(outOfWindowEmail);

  try {
    // In-window: commences in exactly 3 days. Out-of-window: commences in 20 days.
    await pool.query(`UPDATE "OnboardingProcess" SET "commencementDate" = now() + interval '3 days' WHERE "employeeId" = $1`, [inWindowId]);
    await pool.query(`UPDATE "OnboardingProcess" SET "commencementDate" = now() + interval '20 days' WHERE "employeeId" = $1`, [outOfWindowId]);

    const res1 = await fetch("http://localhost:3000/api/cron/data-retention");
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.remindersSent).toBeGreaterThanOrEqual(1);

    const { rows: inWindowRows } = await pool.query<{ commencementReminderLog: number[] }>(
      `SELECT "commencementReminderLog" FROM "Employee" WHERE id = $1`,
      [inWindowId],
    );
    expect(inWindowRows[0].commencementReminderLog).toContain(3);

    const { rows: outOfWindowRows } = await pool.query<{ commencementReminderLog: number[] }>(
      `SELECT "commencementReminderLog" FROM "Employee" WHERE id = $1`,
      [outOfWindowId],
    );
    expect(outOfWindowRows[0].commencementReminderLog).toEqual([]);

    // Calling it again the same day must not re-send (re-push) the same day-mark.
    await fetch("http://localhost:3000/api/cron/data-retention");
    const { rows: afterSecondCall } = await pool.query<{ commencementReminderLog: number[] }>(
      `SELECT "commencementReminderLog" FROM "Employee" WHERE id = $1`,
      [inWindowId],
    );
    expect(afterSecondCall[0].commencementReminderLog).toEqual([3]);
  } finally {
    await cleanupOnboardingTestEmployees();
  }
});

test("the daily HR digest includes employees with incomplete onboarding, without crashing", async () => {
  const employeeId = await createOnboardingTestEmployee(`zztest-digest-${Date.now()}@example.com`);
  try {
    await pool.query(`UPDATE "OnboardingProcess" SET "commencementDate" = now() - interval '2 days' WHERE "employeeId" = $1`, [employeeId]);

    const res = await fetch("http://localhost:3000/api/cron/nudges");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);
  } finally {
    await cleanupOnboardingTestEmployees();
  }
});
