"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { scopedEmployeeWhere } from "@/lib/rbac";

export async function acknowledgeEmployeeDocument(documentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    redirect("/login");
  }

  const document = await db.employeeDocument.findFirst({
    where: { id: documentId, employee: scopedEmployeeWhere(session) },
  });
  if (!document) throw new Error("Not authorized for this document");

  await db.employeeDocumentAck.upsert({
    where: { employeeDocumentId_userId: { employeeDocumentId: documentId, userId: session.user.id } },
    create: { employeeDocumentId: documentId, userId: session.user.id },
    update: {},
  });

  revalidatePath("/client/documents");
  revalidatePath("/client/staff");
}
