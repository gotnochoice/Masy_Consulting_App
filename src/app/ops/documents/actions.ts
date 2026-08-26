"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getOrigin } from "@/lib/url";
import { sendNotification } from "@/lib/email";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { uploadEmployeeDocumentFile } from "@/lib/employee-documents-server";
import { notifyEmployeeDocumentsShared } from "@/lib/notify-document";

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

const sendDocumentSchema = z.object({
  label: z.string().min(1, "Give the document a label"),
  category: z.enum(["EMPLOYMENT_LETTER", "ONBOARDING", "IDENTIFICATION", "CONTRACT", "OTHER"]),
  employeeIds: z.array(z.string().min(1)).min(1, "Select at least one staff member"),
});

export async function sendDocumentToEmployees(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = sendDocumentSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
    employeeIds: formData.getAll("employeeIds"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid document details");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload");
  }

  const result = await uploadEmployeeDocumentFile(file);
  if ("error" in result) throw new Error(result.error);

  const documents = await db.$transaction(
    parsed.data.employeeIds.map((employeeId) =>
      db.employeeDocument.create({
        data: {
          employeeId,
          label: parsed.data.label,
          category: parsed.data.category,
          fileUrl: result.url,
          fileName: file.name,
          uploadedById: session.user.id,
        },
      }),
    ),
  );

  await db.auditLog.createMany({
    data: documents.map((document) => ({
      actorId: session.user.id,
      action: "employee_document.upload",
      targetType: "EmployeeDocument",
      targetId: document.id,
    })),
  });

  await notifyEmployeeDocumentsShared(parsed.data.employeeIds, parsed.data.label);

  revalidatePath("/ops/documents");
  revalidatePath("/ops/employees");
  revalidatePath("/me/documents");
}
