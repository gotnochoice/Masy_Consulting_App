"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";

export type ResetPasswordState = { password: string } | { error: string } | undefined;

const resetPasswordSchema = z.string().trim().min(6, "Password must be at least 6 characters").optional().or(z.literal(""));

// useActionState requires this exact (state, formData) signature.
export async function resetUserPassword(
  userId: string,
  prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireRole("MASY_OPS");

  const parsed = resetPasswordSchema.safeParse(formData.get("password") || undefined);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const password = parsed.data || generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  return { password };
}
