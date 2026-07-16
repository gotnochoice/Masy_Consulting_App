"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const curateSchema = z.object({
  curatedSummary: z.string().min(1, "Write a summary before saving"),
  escalated: z.coerce.boolean(),
});

export async function curateConcern(concernId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = curateSchema.safeParse({
    curatedSummary: formData.get("curatedSummary"),
    escalated: formData.get("escalated") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid concern data");
  }

  const concern = await db.concern.findUnique({ where: { id: concernId } });
  if (!concern) throw new Error("Concern not found");

  await db.concern.update({
    where: { id: concernId },
    data: {
      curatedSummary: parsed.data.curatedSummary,
      escalated: parsed.data.escalated,
      visibility: concern.visibility === "RAW" ? "MASY_REVIEWED" : concern.visibility,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "concern.curate",
      targetType: "Concern",
      targetId: concernId,
    },
  });

  revalidatePath("/ops/concerns");
}

export async function releaseToClient(concernId: string) {
  const session = await requireRole("MASY_OPS");

  const concern = await db.concern.findUnique({ where: { id: concernId } });
  if (!concern) throw new Error("Concern not found");
  if (!concern.curatedSummary) {
    throw new Error("Write a curated summary before releasing this to the client");
  }

  await db.concern.update({
    where: { id: concernId },
    data: { visibility: "CLIENT_VISIBLE" },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "concern.release_to_client",
      targetType: "Concern",
      targetId: concernId,
    },
  });

  revalidatePath("/ops/concerns");
}
