"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const updateSchema = z.object({
  email: z.string().email("Valid email required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function updateMyDetails(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  if (!session.user.employeeId) throw new Error("No employee record linked to this login");

  const parsed = updateSchema.safeParse({
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid details");
  }

  const { dateOfBirth, phone, gender, address, emergencyContactName, emergencyContactPhone, email } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: session.user.employeeId! },
      data: {
        email,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone ?? null,
        gender: gender ?? null,
        address: address ?? null,
        emergencyContactName: emergencyContactName ?? null,
        emergencyContactPhone: emergencyContactPhone ?? null,
      },
    });

    if (email !== session.user.email) {
      await tx.user.update({ where: { id: session.user.id }, data: { email } });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "employee.update_by_self",
        targetType: "Employee",
        targetId: session.user.employeeId!,
      },
    });
  });

  revalidatePath("/me/profile");
  redirect(`/me/profile?done=${encodeURIComponent("Your details were updated")}`);
}
