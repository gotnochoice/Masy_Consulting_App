"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roleTitle: z.string().min(1, "Role is required"),
  email: z.string().email("Valid email required"),
  startDate: z.string().min(1, "Start date is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  staffId: z.string().optional(),
  department: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function updateEmployeeDetails(employeeId: string, formData: FormData) {
  const session = await requireRole("CLIENT");

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!employee || employee.clientOrgId !== session.user.clientOrgId) {
    throw new Error("Not authorized for this employee");
  }

  const parsed = updateSchema.safeParse({
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    staffId: formData.get("staffId") || undefined,
    department: formData.get("department") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const {
    dateOfBirth,
    phone,
    staffId,
    department,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
    ...rest
  } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        ...rest,
        startDate: new Date(parsed.data.startDate),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone ?? null,
        staffId: staffId ?? null,
        department: department ?? null,
        gender: gender ?? null,
        address: address ?? null,
        emergencyContactName: emergencyContactName ?? null,
        emergencyContactPhone: emergencyContactPhone ?? null,
      },
    });

    if (employee.user && employee.user.email !== parsed.data.email) {
      await tx.user.update({ where: { id: employee.user.id }, data: { email: parsed.data.email } });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "employee.update_by_client",
        targetType: "Employee",
        targetId: employeeId,
      },
    });
  });

  revalidatePath("/client/staff");
  redirect(`/client/staff?done=${encodeURIComponent("Staff details updated")}`);
}
