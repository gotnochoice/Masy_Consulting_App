"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function markInProgress(requestId: string) {
  const session = await requireRole("MASY_OPS");

  await db.documentRequest.update({
    where: { id: requestId },
    data: { status: "IN_PROGRESS" },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "document_request.in_progress",
      targetType: "DocumentRequest",
      targetId: requestId,
    },
  });

  revalidatePath("/ops/documents");
}

const respondSchema = z.object({
  decision: z.enum(["FULFILLED", "DECLINED"]),
  responseNote: z.string().min(1, "Add a note before responding"),
});

export async function respondToDocumentRequest(requestId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = respondSchema.safeParse({
    decision: formData.get("decision"),
    responseNote: formData.get("responseNote"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid response");
  }

  await db.documentRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.decision,
      responseNote: parsed.data.responseNote,
      fulfilledAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: parsed.data.decision === "FULFILLED" ? "document_request.fulfill" : "document_request.decline",
      targetType: "DocumentRequest",
      targetId: requestId,
    },
  });

  revalidatePath("/ops/documents");
}
