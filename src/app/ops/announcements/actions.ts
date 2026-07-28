"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const createSchema = z.object({
  clientOrgId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({
    clientOrgId: formData.get("clientOrgId") || undefined,
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid announcement");
  }

  const announcement = await db.announcement.create({
    data: {
      clientOrgId: parsed.data.clientOrgId || null,
      authorRole: "MASY_OPS",
      authorLabel: "Masy Consulting",
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "announcement.create",
      targetType: "Announcement",
      targetId: announcement.id,
    },
  });

  revalidatePath("/ops/announcements");
}

export async function deleteAnnouncement(announcementId: string) {
  const session = await requireRole("MASY_OPS");

  await db.announcement.delete({ where: { id: announcementId } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "announcement.delete",
      targetType: "Announcement",
      targetId: announcementId,
    },
  });

  revalidatePath("/ops/announcements");
}
