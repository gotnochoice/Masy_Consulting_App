import { Pool } from "pg";

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
