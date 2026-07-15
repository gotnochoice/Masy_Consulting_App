import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { Prisma, Role } from "@/generated/prisma/client";

export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await auth();
  if (!session?.user || !roles.includes(session.user.role)) {
    redirect("/login");
  }
  return session;
}

/**
 * The single place tenant scoping is decided: Masy Ops sees every org,
 * everyone else is pinned to their own clientOrgId. Every Employee query
 * across every module should build its `where` clause from this.
 */
export function scopedEmployeeWhere(session: Session): Prisma.EmployeeWhereInput {
  if (session.user.role === "MASY_OPS") return {};
  if (!session.user.clientOrgId) return { id: "__none__" };
  return { clientOrgId: session.user.clientOrgId };
}
