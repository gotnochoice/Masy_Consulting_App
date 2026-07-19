"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";
import { DEFAULT_ONBOARDING_TASKS } from "@/lib/onboarding";

const baseFields = {
  clientOrgId: z.string().min(1, "Organization is required"),
  name: z.string().min(1, "Name is required"),
  roleTitle: z.string().min(1, "Role is required"),
  email: z.string().email("Valid email required"),
  startDate: z.string().min(1, "Start date is required"),
};

const createSchema = z.object(baseFields);
const updateSchema = z.object({
  ...baseFields,
  status: z.enum(["ACTIVE", "ON_LEAVE", "OFFBOARDED"]),
});

export async function createEmployee(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const employee = await db.employee.create({
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
    },
  });

  await db.onboardingTask.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((label) => ({ employeeId: employee.id, label })),
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.create",
      targetType: "Employee",
      targetId: employee.id,
    },
  });

  revalidatePath("/ops/employees");
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = updateSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  await db.employee.update({
    where: { id: employeeId },
    data: {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.update",
      targetType: "Employee",
      targetId: employeeId,
    },
  });

  revalidatePath("/ops/employees");
  redirect("/ops/employees");
}

export type InviteEmployeeState = { email: string; password: string } | { error: string } | undefined;

// useActionState requires this exact (state, formData) signature, even though neither is read here.
export async function inviteEmployeeUser(
  employeeId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: InviteEmployeeState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formData: FormData,
): Promise<InviteEmployeeState> {
  const session = await requireRole("MASY_OPS");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const existingUser = await db.user.findUnique({ where: { email: employee.email } });
  if (existingUser) return { error: "A login with that email already exists" };

  const password = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email: employee.email,
      passwordHash,
      role: "EMPLOYEE",
      clientOrgId: employee.clientOrgId,
      employeeId: employee.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "user.invite_employee",
      targetType: "User",
      targetId: user.id,
    },
  });

  // Deliberately no revalidatePath here: it would immediately re-render this row from the
  // server as "Active," wiping the one-time password display before it's ever seen. The
  // next real navigation to this page picks up the change.
  return { email: employee.email, password };
}
