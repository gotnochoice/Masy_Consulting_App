# Masy Consulting HR Platform

Internal operating system for Masy's Fractional HR pillar — multi-tenant, three
roles (Employee self-service, Masy HR Ops decision layer, Client read-mostly
view), no client admin panel. See `/root/.claude/plans` history or ask Masy
for the full framework doc.

This pass ships the foundation: auth, role-based access control, multi-tenant
scoping, and the Employee Directory module (Phase 1, module 1). Attendance,
Leave, Performance Review, and Recruitment follow the same pattern in later
passes.

## Stack

Next.js (App Router) + TypeScript, Postgres via Prisma, Auth.js (credentials,
JWT sessions), Tailwind CSS.

## Getting started

1. Copy `.env` and set `DATABASE_URL` to a Postgres instance, and a real
   `AUTH_SECRET` (`npx auth secret` or any random string) for anything beyond
   local dev.
2. Install dependencies and set up the database:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed
   ```

   The seed script prints demo login credentials for one Masy HR Ops user,
   and one Client + one Employee user per demo client org.

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you'll be redirected
   to `/login`, then to the right dashboard for your role after signing in.

## Access control model

- `src/lib/auth.config.ts` — edge-safe base config (used directly by
  `src/proxy.ts`, Next's middleware convention). Keeps the Postgres driver
  out of the Edge runtime.
- `src/auth.ts` — full Auth.js config with the Credentials provider; only
  imported from Node.js-runtime code (route handlers, server components,
  server actions).
- `src/proxy.ts` — gates `/ops/**` to `MASY_OPS`, `/client/**` to `CLIENT`,
  `/me/**` to `EMPLOYEE`.
- `src/lib/rbac.ts` — `requireRole()` for page/action guards, and
  `scopedEmployeeWhere()`, the single helper that builds tenant-scoped Prisma
  `where` clauses. Every module should filter through a helper like this one,
  not ad hoc `clientOrgId` checks scattered across queries.

Every write in `/ops/employees` logs an `AuditLog` row.

## Useful scripts

- `npm run db:studio` — browse the database with Prisma Studio.
- `npm run lint` / `npx tsc --noEmit` — lint and typecheck.
