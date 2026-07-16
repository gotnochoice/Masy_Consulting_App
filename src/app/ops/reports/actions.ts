"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

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
