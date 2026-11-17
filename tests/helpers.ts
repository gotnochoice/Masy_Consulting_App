import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Talks to Postgres directly with `pg` rather than importing the app's Prisma client:
// the generated Prisma client is ESM-only (uses `import.meta`), which Playwright Test's
// CommonJS-based test transform can't load.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const OPS_LOGIN = { email: "ops@masyconsulting.example", password: "MasyOps#2026" };
export const CLIENT_LOGIN = { email: "founder@lagosbites.example", password: "ClientView#2026" };
export const EMPLOYEE_LOGIN = { email: "ada@lagosbites.example", password: "Employee#2026" };

export const ZZTEST_PREFIX = "ZZTEST";

export async function findSeededRole() {
  const { rows } = await pool.query<{ id: string; slug: string; companySlug: string }>(
    `SELECT r.id, r.slug, c.slug AS "companySlug"
     FROM "OpenRole" r JOIN "ClientOrg" c ON c.id = r."clientOrgId"
     WHERE r.title = 'Video Editor' AND c.slug = 'lagos-bites-catering'
     LIMIT 1`,
  );
  if (rows.length === 0) {
    throw new Error("Seeded 'Video Editor' role not found -- run `npm run db:seed` before the test suite.");
  }
  return rows[0];
}

export async function cleanupZzTestCandidates(roleId: string) {
  await pool.query(`DELETE FROM "Candidate" WHERE "openRoleId" = $1 AND name LIKE $2`, [roleId, `${ZZTEST_PREFIX}%`]);
}

export async function countCandidates(roleId: string) {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM "Candidate" WHERE "openRoleId" = $1`,
    [roleId],
  );
  return Number(rows[0].count);
}

export const ZZTEST_ONBOARDING_PASSWORD = "ZzTest#2026";
const ONBOARDING_STEP_TYPES = [
  "PERSONAL_DETAILS",
  "IDENTITY_DOCUMENTS",
  "GUARANTORS",
  "ACKNOWLEDGMENTS",
  "SIGNATURE",
  "PROPERTY_HANDOVER",
];

// Creates a ZZTEST employee with a full OnboardingProcess (every step NOT_STARTED, or
// overridden via `stepStatuses`) and a login, for tests exercising a single onboarding step
// in isolation. Mirrors what createOnboardingProcess does in the app, without going through
// the Ops UI each time.
export async function createOnboardingTestEmployee(
  email: string,
  stepStatuses: Partial<Record<(typeof ONBOARDING_STEP_TYPES)[number], string>> = {},
): Promise<string> {
  const { rows: orgRows } = await pool.query<{ id: string }>(`SELECT id FROM "ClientOrg" WHERE slug = 'lagos-bites-catering'`);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "Employee" (id, "clientOrgId", name, "roleTitle", email, "startDate", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, 'ZZTEST Onboarding Hire', 'ZZTEST Role', $2, now(), now(), now())
     RETURNING id`,
    [orgRows[0].id, `zztest-${Date.now()}@example.com`],
  );
  const employeeId = rows[0].id;

  await pool.query(
    `INSERT INTO "OnboardingProcess" (id, "employeeId", "commencementDate", "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, now(), now(), now())`,
    [employeeId],
  );
  const { rows: processRows } = await pool.query<{ id: string }>(`SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1`, [employeeId]);
  const processId = processRows[0].id;

  for (const stepType of ONBOARDING_STEP_TYPES) {
    const status = stepStatuses[stepType] ?? "NOT_STARTED";
    await pool.query(
      `INSERT INTO "OnboardingStep" (id, "onboardingProcessId", "stepType", status, "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2::"OnboardingStepType", $3::"OnboardingStepStatus", now(), now())`,
      [processId, stepType, status],
    );
  }

  const passwordHash = await bcrypt.hash(ZZTEST_ONBOARDING_PASSWORD, 10);
  await pool.query(`INSERT INTO "User" (id, email, "passwordHash", role, "employeeId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, 'EMPLOYEE', $3, now())`, [
    email,
    passwordHash,
    employeeId,
  ]);

  return employeeId;
}

export async function cleanupOnboardingTestEmployees() {
  const { rows } = await pool.query<{ id: string }>(`SELECT id FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
  for (const { id } of rows) {
    await pool.query(`DELETE FROM "Guarantor" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "EmployeeDocument" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "OnboardingStep" WHERE "onboardingProcessId" IN (SELECT id FROM "OnboardingProcess" WHERE "employeeId" = $1)`, [id]);
    await pool.query(`DELETE FROM "OnboardingProcess" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "OnboardingTask" WHERE "employeeId" = $1`, [id]);
    await pool.query(`DELETE FROM "User" WHERE "employeeId" = $1`, [id]);
  }
  await pool.query(`DELETE FROM "Employee" WHERE name LIKE 'ZZTEST%'`);
}
