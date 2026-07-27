import { Resend } from "resend";
import { db } from "@/lib/db";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Masy Consulting HR <onboarding@resend.dev>";

export async function sendOpsNotification(subject: string, body: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set, skipped notification: ${subject}`);
    return;
  }

  const to = process.env.OPS_NOTIFICATION_EMAIL
    ? [process.env.OPS_NOTIFICATION_EMAIL]
    : (await db.user.findMany({ where: { role: "MASY_OPS" }, select: { email: true } })).map((u) => u.email);

  if (to.length === 0) return;

  try {
    await resend.emails.send({ from: FROM, to, subject, text: body });
  } catch (err) {
    console.error("[email] failed to send notification:", err);
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) return { sent: false };
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Reset your Masy Consulting HR password",
      text:
        "Click the link below to set a new password. This link expires in 1 hour.\n\n" +
        `${resetUrl}\n\n` +
        "If you didn't request this, you can ignore this email.",
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] failed to send password reset:", err);
    return { sent: false };
  }
}

export function isEmailConfigured() {
  return resend !== null;
}

export async function sendReportEmail(to: string[], subject: string, body: string) {
  if (!resend || to.length === 0) return { sent: false };
  try {
    await resend.emails.send({ from: FROM, to, subject, text: body });
    return { sent: true };
  } catch (err) {
    console.error("[email] failed to send monthly report:", err);
    return { sent: false };
  }
}
