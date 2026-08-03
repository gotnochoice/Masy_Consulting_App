"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function acknowledgeAnnouncement(announcementId: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "CLIENT" && session.user.role !== "EMPLOYEE")) {
    redirect("/login");
  }

  await db.announcementAck.upsert({
    where: { announcementId_userId: { announcementId, userId: session.user.id } },
    create: { announcementId, userId: session.user.id },
    update: {},
  });

  revalidatePath("/client/announcements");
  revalidatePath("/client/staff");
  revalidatePath("/me/announcements");
  revalidatePath("/me/profile");
}
