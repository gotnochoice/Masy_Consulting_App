"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  content: z.string().min(1, "Tell us what's going on"),
});

export async function submitConcern(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const parsed = schema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid submission");
  }

  await db.concern.create({
    data: { employeeId, content: parsed.data.content },
  });

  revalidatePath("/me/concerns");
}
