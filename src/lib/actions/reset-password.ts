"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";

export type ResetPasswordState = { password: string } | { error: string } | undefined;

export async function resetUserPassword(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: ResetPasswordState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireRole("MASY_OPS");

  const password = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  return { password };
}
