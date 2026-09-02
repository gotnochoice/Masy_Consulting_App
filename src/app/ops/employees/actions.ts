"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { generateTemporaryPassword } from "@/lib/password";
import { DEFAULT_ONBOARDING_TASKS } from "@/lib/onboarding";
import { getOrigin } from "@/lib/url";
import { uploadEmployeePhoto } from "@/lib/photo";
import { uploadEmployeeDocumentFile } from "@/lib/employee-documents-server";
import { notifyEmployeeDocumentsShared } from "@/lib/notify-document";

const baseFields = {
  clientOrgId: z.string().min(1, "Organization is required"),
  name: z.string().min(1, "Name is required"),
  roleTitle: z.string().min(1, "Role is required"),
  email: z.string().email("Valid email required"),
  startDate: z.string().min(1, "Start date is required"),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  staffId: z.string().optional(),
  department: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  salary: z.coerce.number().min(0, "Salary can't be negative").optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountHolderName: z.string().optional(),
};

const leaveBalanceField = { leaveBalanceDays: z.coerce.number().int().min(0, "Leave balance can't be negative") };

const createSchema = z.object({ ...baseFields, ...leaveBalanceField });
const updateSchema = z.object({
  ...baseFields,
  ...leaveBalanceField,
  status: z.enum(["ACTIVE", "ON_LEAVE", "OFFBOARDED"]),
});

export async function createEmployee(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    staffId: formData.get("staffId") || undefined,
    department: formData.get("department") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    salary: formData.get("salary") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankName: formData.get("bankName") || undefined,
    bankAccountHolderName: formData.get("bankAccountHolderName") || undefined,
    leaveBalanceDays: formData.get("leaveBalanceDays"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const {
    dateOfBirth,
    phone,
    whatsappNumber,
    staffId,
    department,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
    salary,
    ...rest
  } = parsed.data;

  let photoUrl: string | null = null;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await uploadEmployeePhoto(photoFile);
    if ("error" in result) throw new Error(result.error);
    photoUrl = result.url;
  }

  const employee = await db.employee.create({
    data: {
      ...rest,
      startDate: new Date(parsed.data.startDate),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phone: phone ?? null,
      whatsappNumber: whatsappNumber ?? null,
      staffId: staffId ?? null,
      department: department ?? null,
      gender: gender ?? null,
      address: address ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      salary: salary ?? null,
      photoUrl,
    },
  });

  await db.onboardingTask.createMany({
    data: DEFAULT_ONBOARDING_TASKS.map((label) => ({ employeeId: employee.id, label })),
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.create",
      targetType: "Employee",
      targetId: employee.id,
    },
  });

  revalidatePath("/ops/employees");
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = updateSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    name: formData.get("name"),
    roleTitle: formData.get("roleTitle"),
    email: formData.get("email"),
    startDate: formData.get("startDate"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    phone: formData.get("phone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    staffId: formData.get("staffId") || undefined,
    department: formData.get("department") || undefined,
    gender: formData.get("gender") || undefined,
    address: formData.get("address") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    salary: formData.get("salary") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    bankName: formData.get("bankName") || undefined,
    bankAccountHolderName: formData.get("bankAccountHolderName") || undefined,
    status: formData.get("status"),
    leaveBalanceDays: formData.get("leaveBalanceDays"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid employee data");
  }

  const {
    dateOfBirth,
    phone,
    whatsappNumber,
    staffId,
    department,
    gender,
    address,
    emergencyContactName,
    emergencyContactPhone,
    salary,
    bankAccountNumber,
    bankName,
    bankAccountHolderName,
    ...rest
  } = parsed.data;

  const existingUser = await db.user.findUnique({ where: { employeeId } });

  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await uploadEmployeePhoto(photoFile);
    if ("error" in result) throw new Error(result.error);
    photoUrl = result.url;
  }

  await db.employee.update({
    where: { id: employeeId },
    data: {
      ...rest,
      startDate: new Date(parsed.data.startDate),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phone: phone ?? null,
      whatsappNumber: whatsappNumber ?? null,
      staffId: staffId ?? null,
      department: department ?? null,
      gender: gender ?? null,
      address: address ?? null,
      emergencyContactName: emergencyContactName ?? null,
      emergencyContactPhone: emergencyContactPhone ?? null,
      salary: salary ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankName: bankName ?? null,
      bankAccountHolderName: bankAccountHolderName ?? null,
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  if (existingUser && existingUser.email !== parsed.data.email) {
    await db.user.update({ where: { id: existingUser.id }, data: { email: parsed.data.email } });
  }

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.update",
      targetType: "Employee",
      targetId: employeeId,
    },
  });

  revalidatePath("/ops/employees");
  redirect("/ops/employees");
}

export type InviteEmployeeState = { email: string; password: string } | { error: string } | undefined;

const invitePasswordSchema = z.string().trim().min(6, "Password must be at least 6 characters").optional().or(z.literal(""));

// useActionState requires this exact (state, formData) signature.
export async function inviteEmployeeUser(
  employeeId: string,
  prevState: InviteEmployeeState,
  formData: FormData,
): Promise<InviteEmployeeState> {
  const session = await requireRole("MASY_OPS");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const existingUser = await db.user.findUnique({ where: { email: employee.email } });
  if (existingUser) return { error: "A login with that email already exists" };

  const parsedPassword = invitePasswordSchema.safeParse(formData.get("password") || undefined);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? "Invalid password" };
  }

  const password = parsedPassword.data || generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email: employee.email,
      passwordHash,
      role: "EMPLOYEE",
      clientOrgId: employee.clientOrgId,
      employeeId: employee.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "user.invite_employee",
      targetType: "User",
      targetId: user.id,
    },
  });

  // Deliberately no revalidatePath here: it would immediately re-render this row from the
  // server as "Active," wiping the one-time password display before it's ever seen. The
  // next real navigation to this page picks up the change.
  return { email: employee.email, password };
}

export type OnboardingLinkState = { link: string } | { error: string } | undefined;

export async function generateOnboardingLink(
  employeeId: string,
  _prevState: OnboardingLinkState,
): Promise<OnboardingLinkState> {
  await requireRole("MASY_OPS");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const existingUser = await db.user.findUnique({ where: { email: employee.email } });
  if (existingUser) return { error: "This employee already has a login." };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.onboardingInvite.upsert({
    where: { employeeId },
    create: { employeeId, token, expiresAt },
    update: { token, expiresAt, completedAt: null },
  });

  const origin = await getOrigin();
  return { link: `${origin}/onboard/${token}` };
}

export async function offboardEmployee(employeeId: string) {
  const session = await requireRole("MASY_OPS");

  await db.employee.update({ where: { id: employeeId }, data: { status: "OFFBOARDED" } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.offboard",
      targetType: "Employee",
      targetId: employeeId,
    },
  });

  revalidatePath("/ops/employees");
  revalidatePath("/ops/overview");
  revalidatePath("/client/staff");
}

export async function reactivateEmployee(employeeId: string) {
  const session = await requireRole("MASY_OPS");

  await db.employee.update({ where: { id: employeeId }, data: { status: "ACTIVE" } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.reactivate",
      targetType: "Employee",
      targetId: employeeId,
    },
  });

  revalidatePath("/ops/employees");
  revalidatePath("/ops/overview");
  revalidatePath("/client/staff");
}

const uploadDocumentSchema = z.object({
  label: z.string().min(1, "Give the document a label"),
  category: z.enum(["EMPLOYMENT_LETTER", "ONBOARDING", "IDENTIFICATION", "CONTRACT", "OTHER"]),
});

export async function uploadEmployeeDocument(employeeId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = uploadDocumentSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
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
      action: "employee_document.upload",
      targetType: "EmployeeDocument",
      targetId: document.id,
    },
  });

  await notifyEmployeeDocumentsShared([employeeId], parsed.data.label);

  revalidatePath(`/ops/employees/${employeeId}/edit`);
  revalidatePath("/me/documents");
}

export async function deleteEmployeeDocument(documentId: string, employeeId: string) {
  const session = await requireRole("MASY_OPS");

  await db.employeeDocument.delete({ where: { id: documentId } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee_document.delete",
      targetType: "EmployeeDocument",
      targetId: documentId,
    },
  });

  revalidatePath(`/ops/employees/${employeeId}/edit`);
  revalidatePath("/me/documents");
}

const ONBOARDING_QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK", "MULTIPLE_CHOICE", "CHECKBOXES"] as const;

const addOnboardingQuestionSchema = z.object({
  label: z.string().min(1, "Question is required"),
  type: z.enum(ONBOARDING_QUESTION_TYPES),
  required: z.boolean(),
  options: z.string().optional(),
});

function parseOnboardingOptions(type: (typeof ONBOARDING_QUESTION_TYPES)[number], raw: string | undefined) {
  if (type !== "MULTIPLE_CHOICE" && type !== "CHECKBOXES") return [];
  return (raw ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

export async function addOnboardingQuestion(employeeId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addOnboardingQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");
  }

  const last = await db.onboardingQuestion.findFirst({
    where: { employeeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.onboardingQuestion.create({
    data: {
      employeeId,
      label: parsed.data.label,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parseOnboardingOptions(parsed.data.type, parsed.data.options),
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/ops/employees/${employeeId}/edit`);
}

export async function deleteOnboardingQuestion(questionId: string, employeeId: string) {
  await requireRole("MASY_OPS");

  await db.onboardingQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/ops/employees/${employeeId}/edit`);
}
