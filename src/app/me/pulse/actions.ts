"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function submitPulseCheckIn(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const parsed = schema.safeParse({
    score: formData.get("score"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid check-in");
  }

  await db.pulseCheckIn.create({
    data: { employeeId, score: parsed.data.score, comment: parsed.data.comment },
  });

  revalidatePath("/me/pulse");
}
