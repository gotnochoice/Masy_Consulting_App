"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getMonthlyReportData } from "@/lib/monthly-report";
import { getOrigin } from "@/lib/url";
import { sendReportEmail } from "@/lib/email";

const schema = z.object({
  clientOrgId: z.string().min(1),
  month: z.string().min(1),
  notes: z.string(),
});

export async function saveReportNotes(formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = schema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    month: formData.get("month"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid report notes");
  }

  const [year, monthNum] = parsed.data.month.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year, monthNum - 1, 1));

  await db.monthlyReportNote.upsert({
    where: { clientOrgId_month: { clientOrgId: parsed.data.clientOrgId, month: monthDate } },
    create: { clientOrgId: parsed.data.clientOrgId, month: monthDate, notes: parsed.data.notes },
    update: { notes: parsed.data.notes },
  });

  revalidatePath("/ops/reports");
}

export async function emailReportToClient(clientOrgId: string, monthValue: string) {
  await requireRole("MASY_OPS");

  const [org, clientUsers, report] = await Promise.all([
    db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { name: true } }),
    db.user.findMany({ where: { clientOrgId, role: "CLIENT" }, select: { email: true } }),
    getMonthlyReportData(clientOrgId, monthValue),
  ]);

  const redirectBase = `/ops/reports?org=${clientOrgId}&month=${monthValue}`;

  if (!org || clientUsers.length === 0) {
    redirect(`${redirectBase}&done=${encodeURIComponent("No client login found to email")}`);
  }

  const origin = await getOrigin();
  const reportUrl = `${origin}/client/reports?month=${monthValue}`;

  const { sent } = await sendReportEmail(
    clientUsers.map((u) => u.email),
    `Your ${report.monthLabel} report from Masy Consulting`,
    `Hi,\n\nYour monthly report for ${org.name} is ready.\n\n` +
      `Attendance completion: ${report.attendancePct}%\n` +
      `Leave days taken: ${report.leaveDaysTaken}\n` +
      `Reviews released: ${report.releasedReviews}/${report.totalReviews}\n` +
      `Concerns shared: ${report.concernsReleased}\n\n` +
      `${report.notes ? `Notes from your Masy HR contact:\n${report.notes}\n\n` : ""}` +
      `View the full report: ${reportUrl}`,
  );

  redirect(
    `${redirectBase}&done=${encodeURIComponent(sent ? "Report emailed to client" : "Email isn't set up yet, ask your developer to add a RESEND_API_KEY")}`,
  );
}
