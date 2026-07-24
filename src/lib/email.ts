import { Resend } from "resend";
import { db } from "@/lib/db";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Masy Consulting HR <onboarding@resend.dev>";

export async function sendOpsNotification(subject: string, body: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped notification: ${subject}`);
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
