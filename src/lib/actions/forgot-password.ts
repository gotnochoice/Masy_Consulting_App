"use server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";

export type ForgotPasswordState = { sent: true; emailConfigured: boolean } | { error: string } | undefined;

const schema = z.object({ email: z.string().email("Enter a valid email") });

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  }
  if (!isEmailConfigured()) {
    return { sent: true, emailConfigured: false };
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const origin = await getOrigin();
    await sendPasswordResetEmail(user.email, `${origin}/reset-password/${token}`);
  }
  return { sent: true, emailConfigured: true };
}
