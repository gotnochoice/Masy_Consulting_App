"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { scopedEmployeeWhere } from "@/lib/rbac";

export async function acknowledgeConcern(concernId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    redirect("/login");
  }

  const concern = await db.concern.findFirst({
    where: { id: concernId, employee: scopedEmployeeWhere(session) },
  });
  if (!concern) throw new Error("Not authorized for this concern");

  await db.concernAck.upsert({
    where: { concernId_userId: { concernId, userId: session.user.id } },
    create: { concernId, userId: session.user.id },
    update: {},
  });

  revalidatePath("/client/concerns");
}
