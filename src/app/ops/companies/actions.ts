"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";

const createSchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

export async function createCompany(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company data");
  }

  const org = await db.clientOrg.create({ data: { name: parsed.data.name } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "company.create",
      targetType: "ClientOrg",
      targetId: org.id,
    },
  });

  revalidatePath("/ops/companies");
}

export type InviteClientState = { email: string; password: string } | { error: string } | undefined;

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
});

export async function inviteClientUser(
  clientOrgId: string,
  _prevState: InviteClientState,
  formData: FormData,
): Promise<InviteClientState> {
  const session = await requireRole("MASY_OPS");

  const parsed = inviteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: "A login with that email already exists" };
  }

  const password = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: { email: parsed.data.email, passwordHash, role: "CLIENT", clientOrgId },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "user.invite_client",
      targetType: "User",
      targetId: user.id,
    },
  });

  // Deliberately no revalidatePath here: revalidating would immediately re-render this
  // row from the server as "already has a login," wiping the one-time password display
  // (InviteClientForm) before it's ever seen. The next real navigation picks up the change.
  return { email: parsed.data.email, password };
}

export async function deleteCompany(clientOrgId: string) {
  const session = await requireRole("MASY_OPS");

  const org = await db.clientOrg.findUnique({
    where: { id: clientOrgId },
    include: { employees: { select: { id: true } }, openRoles: { select: { id: true } } },
  });
  if (!org) return;

  const employeeIds = org.employees.map((e) => e.id);
  const openRoleIds = org.openRoles.map((r) => r.id);

  await db.$transaction([
    db.attendanceRecord.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.leaveRequest.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.performanceReview.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.concern.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.pulseCheckIn.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.onboardingTask.deleteMany({ where: { employeeId: { in: employeeIds } } }),
    db.candidate.deleteMany({ where: { openRoleId: { in: openRoleIds } } }),
    db.openRole.deleteMany({ where: { clientOrgId } }),
    db.user.deleteMany({ where: { clientOrgId } }),
    db.employee.deleteMany({ where: { clientOrgId } }),
    db.monthlyReportNote.deleteMany({ where: { clientOrgId } }),
    db.clientOrg.delete({ where: { id: clientOrgId } }),
  ]);

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "company.delete",
      targetType: "ClientOrg",
      targetId: clientOrgId,
    },
  });

  revalidatePath("/ops/companies");
}
