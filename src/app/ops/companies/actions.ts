"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

export async function createCompany(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid company data");
  }

  const org = await db.clientOrg.create({ data: { name: parsed.data.name } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "company.create",
      targetType: "ClientOrg",
      targetId: org.id,
    },
  });

  revalidatePath("/ops/companies");
}
