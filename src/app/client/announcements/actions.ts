"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Message is required"),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireRole("CLIENT");
  if (!session.user.clientOrgId) throw new Error("No organization linked to this account");

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid announcement");
  }

  const org = await db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } });

  await db.announcement.create({
    data: {
      clientOrgId: session.user.clientOrgId,
      authorRole: "CLIENT",
      authorLabel: org?.name ?? "Your organization",
      title: parsed.data.title,
      body: parsed.data.body,
    },
  });

  revalidatePath("/client/announcements");
}

export async function deleteAnnouncement(announcementId: string) {
  const session = await requireRole("CLIENT");

  const announcement = await db.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement || announcement.clientOrgId !== session.user.clientOrgId || announcement.authorRole !== "CLIENT") {
    throw new Error("Not authorized to delete this announcement");
  }

  await db.announcement.delete({ where: { id: announcementId } });
  revalidatePath("/client/announcements");
}
