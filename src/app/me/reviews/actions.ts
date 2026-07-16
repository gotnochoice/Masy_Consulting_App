"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  cycle: z.string().min(1, "Cycle is required"),
  selfAssessment: z.string().min(1, "Write your self-assessment"),
});

export async function submitReview(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const parsed = schema.safeParse({
    cycle: formData.get("cycle"),
    selfAssessment: formData.get("selfAssessment"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review submission");
  }

  await db.performanceReview.create({
    data: {
      employeeId,
      cycle: parsed.data.cycle,
      selfAssessment: parsed.data.selfAssessment,
    },
  });

  revalidatePath("/me/reviews");
}
