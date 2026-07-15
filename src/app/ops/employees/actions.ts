"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

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
