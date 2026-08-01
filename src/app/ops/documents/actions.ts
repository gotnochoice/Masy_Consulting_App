"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getOrigin } from "@/lib/url";
import { sendNotification } from "@/lib/email";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";

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

  const updated = await db.documentRequest.update({
    where: { id: requestId },
    data: {
      status: parsed.data.decision,
      responseNote: parsed.data.responseNote,
      fulfilledAt: new Date(),
    },
    include: { employee: true },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: parsed.data.decision === "FULFILLED" ? "document_request.fulfill" : "document_request.decline",
      targetType: "DocumentRequest",
      targetId: requestId,
    },
  });

  const origin = await getOrigin();
  await sendNotification(
    updated.employee.email,
    parsed.data.decision === "FULFILLED" ? "Your document request is ready" : "Your document request was declined",
    `Your request for a ${DOCUMENT_TYPE_LABELS[updated.type]} was ${parsed.data.decision === "FULFILLED" ? "fulfilled" : "declined"}.\n\n` +
      `${parsed.data.responseNote}\n\nView: ${origin}/me/documents`,
  );

  revalidatePath("/ops/documents");
}
