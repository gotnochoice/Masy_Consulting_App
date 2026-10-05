"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadEmployeePhoto } from "@/lib/photo";

const updateSchema = z.object({
  email: z.string().email("Valid email required"),
  startDate: z.string().min(1, "Start date is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountHolderName: z.string().optional(),
});

export async function updateMyDetails(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  if (!session.user.employeeId) throw new Error("No employee record linked to this login");

  const parsed = updateSchema.safeParse({
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankName: formData.get("bankName") || undefined,
    bankAccountHolderName: formData.get("bankAccountHolderName") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid details");
  }

  const {
    dateOfBirth,
    phone,
    whatsappNumber,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
    bankAccountNumber,
    bankName,
    bankAccountHolderName,
    email,
    startDate,
  } = parsed.data;

  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await uploadEmployeePhoto(photoFile);
    if ("error" in result) throw new Error(result.error);
    photoUrl = result.url;
  }

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: session.user.employeeId! },
      data: {
        email,
        startDate: new Date(startDate),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone ?? null,
        whatsappNumber: whatsappNumber ?? null,
        gender: gender ?? null,
        address: address ?? null,
        emergencyContactName: emergencyContactName ?? null,
        emergencyContactPhone: emergencyContactPhone ?? null,
        bankAccountNumber: bankAccountNumber ?? null,
        bankName: bankName ?? null,
        bankAccountHolderName: bankAccountHolderName ?? null,
        ...(photoUrl ? { photoUrl } : {}),
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
