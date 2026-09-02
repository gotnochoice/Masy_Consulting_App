"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { uploadEmployeePhoto } from "@/lib/photo";

export type OnboardingFormState = { success: true } | { error: string } | undefined;

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    whatsappNumber: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    bankAccountHolderName: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export async function completeOnboarding(
  token: string,
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const invite = await db.onboardingInvite.findUnique({ where: { token } });
  if (!invite || invite.completedAt || invite.expiresAt < new Date()) {
    return { error: "This onboarding link is no longer valid. Ask Masy to send you a new one." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    bankName: formData.get("bankName") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankAccountHolderName: formData.get("bankAccountHolderName") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const existingUser = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: "That email already has a login. Use a different email or contact Masy." };
  }

  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await uploadEmployeePhoto(photoFile);
    if ("error" in result) return { error: result.error };
    photoUrl = result.url;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const employee = await db.employee.findUnique({
    where: { id: invite.employeeId },
    include: { onboardingQuestions: true },
  });
  if (!employee) return { error: "Employee record not found. Contact Masy." };

  const questionAnswers: { id: string; value: string }[] = [];
  for (const q of employee.onboardingQuestions) {
    let value: string;
    if (q.type === "CHECKBOXES") {
      const selected = formData.getAll(`answer_${q.id}`).filter((v): v is string => typeof v === "string");
      const invalid = selected.find((v) => !q.options.includes(v));
      if (invalid) return { error: `"${q.label}" has an invalid answer.` };
      value = selected.join(", ");
    } else {
      const raw = formData.get(`answer_${q.id}`);
      value = typeof raw === "string" ? raw.trim() : "";
      if (q.type === "MULTIPLE_CHOICE" && value && !q.options.includes(value)) {
        return { error: `"${q.label}" has an invalid answer.` };
      }
    }
    if (q.required && !value) return { error: `"${q.label}" is required.` };
    if (value) questionAnswers.push({ id: q.id, value });
  }

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: invite.employeeId },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        address: parsed.data.address ?? null,
        phone: parsed.data.phone ?? null,
        whatsappNumber: parsed.data.whatsappNumber ?? null,
        bankName: parsed.data.bankName ?? null,
        bankAccountNumber: parsed.data.bankAccountNumber ?? null,
        bankAccountHolderName: parsed.data.bankAccountHolderName ?? null,
        ...(employee.status === "PENDING" ? { status: "ACTIVE" } : {}),
        ...(photoUrl ? { photoUrl } : {}),
      },
    });

    for (const { id, value } of questionAnswers) {
      await tx.onboardingQuestion.update({ where: { id }, data: { answer: value } });
    }

    const user = await tx.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        role: "EMPLOYEE",
        clientOrgId: employee.clientOrgId,
        employeeId: employee.id,
      },
    });

    await tx.onboardingInvite.update({ where: { id: invite.id }, data: { completedAt: new Date() } });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "employee.self_onboard",
        targetType: "Employee",
        targetId: employee.id,
      },
    });
  });

  revalidatePath("/ops/employees");
  revalidatePath(`/ops/employees/${employee.id}/edit`);
  return { success: true };
}
