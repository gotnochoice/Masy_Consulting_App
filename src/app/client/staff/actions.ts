"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadEmployeePhoto } from "@/lib/photo";
import { uploadEmployeeDocumentFile } from "@/lib/employee-documents-server";
import { notifyEmployeeDocumentsShared } from "@/lib/notify-document";

const updateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  roleTitle: z.string().min(1, "Role is required"),
  email: z.string().email("Valid email required"),
  startDate: z.string().min(1, "Start date is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  staffId: z.string().optional(),
  department: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

export async function updateEmployeeDetails(employeeId: string, formData: FormData) {
  const session = await requireRole("CLIENT");

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!employee || employee.clientOrgId !== session.user.clientOrgId) {
    throw new Error("Not authorized for this employee");
  }

  const parsed = updateSchema.safeParse({
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    staffId: formData.get("staffId") || undefined,
    department: formData.get("department") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const {
    dateOfBirth,
    phone,
    staffId,
    department,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
    ...rest
  } = parsed.data;

  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await uploadEmployeePhoto(photoFile);
    if ("error" in result) throw new Error(result.error);
    photoUrl = result.url;
  }

  await db.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        ...rest,
        startDate: new Date(parsed.data.startDate),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone ?? null,
        staffId: staffId ?? null,
        department: department ?? null,
        gender: gender ?? null,
        address: address ?? null,
        emergencyContactName: emergencyContactName ?? null,
        emergencyContactPhone: emergencyContactPhone ?? null,
        ...(photoUrl ? { photoUrl } : {}),
      },
    });

    if (employee.user && employee.user.email !== parsed.data.email) {
      await tx.user.update({ where: { id: employee.user.id }, data: { email: parsed.data.email } });
    }

    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "employee.update_by_client",
        targetType: "Employee",
        targetId: employeeId,
      },
    });
  });

  revalidatePath("/client/staff");
  redirect(`/client/staff?done=${encodeURIComponent("Staff details updated")}`);
}

const uploadDocumentSchema = z.object({
  label: z.string().min(1, "Give the document a label"),
  category: z.enum(["EMPLOYMENT_LETTER", "ONBOARDING", "IDENTIFICATION", "CONTRACT", "OTHER"]),
});

export type UploadClientDocumentState = { error: string } | undefined;

// Returns an error instead of throwing -- a bad file type, an oversized upload, or a blob
// storage hiccup are all routine, foreseeable outcomes here, not crashes. A thrown Error from
// a form action with no useActionState takes down the whole page instead of showing what to
// fix (the same bug that once swallowed a real performance review submission).
export async function uploadClientEmployeeDocument(
  employeeId: string,
  _prevState: UploadClientDocumentState,
  formData: FormData,
): Promise<UploadClientDocumentState> {
  const session = await requireRole("CLIENT");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.clientOrgId !== session.user.clientOrgId) {
    return { error: "Not authorized for this employee" };
  }

  const parsed = uploadDocumentSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document details" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload" };
  }

  const result = await uploadEmployeeDocumentFile(file);
  if ("error" in result) return { error: result.error };

  const document = await db.employeeDocument.create({
    data: {
      employeeId,
      label: parsed.data.label,
      category: parsed.data.category,
      fileUrl: result.url,
      fileName: file.name,
      uploadedById: session.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee_document.upload_by_client",
      targetType: "EmployeeDocument",
      targetId: document.id,
    },
  });

  await notifyEmployeeDocumentsShared([employeeId], parsed.data.label);

  revalidatePath(`/client/staff/${employeeId}/edit`);
  revalidatePath("/me/documents");
}

export async function deleteClientEmployeeDocument(documentId: string, employeeId: string) {
  const session = await requireRole("CLIENT");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.clientOrgId !== session.user.clientOrgId) {
    throw new Error("Not authorized for this employee");
  }

  await db.employeeDocument.deleteMany({ where: { id: documentId, employeeId } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee_document.delete_by_client",
      targetType: "EmployeeDocument",
      targetId: documentId,
    },
  });

  revalidatePath(`/client/staff/${employeeId}/edit`);
  revalidatePath("/me/documents");
}
