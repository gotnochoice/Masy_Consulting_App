"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { slugify } from "@/lib/slug";

const ROLE_STAGES = ["SOURCING", "INTERVIEWING", "OFFER", "FILLED"] as const;
const CANDIDATE_STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"] as const;
const QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK"] as const;

const createRoleSchema = z.object({
  clientOrgId: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Role title is required"),
});

export async function createRole(formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = createRoleSchema.safeParse({
    clientOrgId: formData.get("clientOrgId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid role data");
  }

  const role = await db.openRole.create({
    data: { ...parsed.data, slug: slugify(parsed.data.title) },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.create",
      targetType: "OpenRole",
      targetId: role.id,
    },
  });

  revalidatePath("/ops/recruitment");
}

export async function updateRoleStage(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const stage = z.enum(ROLE_STAGES).safeParse(formData.get("stage"));
  if (!stage.success) throw new Error("Invalid stage");

  await db.openRole.update({ where: { id: roleId }, data: { stage: stage.data } });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/recruitment");
}

export async function toggleAcceptingApplications(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const accepting = formData.get("acceptingApplications") === "true";
  await db.openRole.update({ where: { id: roleId }, data: { acceptingApplications: accepting } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const updateDescriptionSchema = z.object({
  description: z.string().optional(),
});

export async function updateRoleDescription(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = updateDescriptionSchema.safeParse({ description: formData.get("description") || undefined });
  if (!parsed.success) throw new Error("Invalid description");

  await db.openRole.update({ where: { id: roleId }, data: { description: parsed.data.description } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const addQuestionSchema = z.object({
  label: z.string().min(1, "Question is required"),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
});

export async function addQuestion(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");
  }

  const count = await db.roleQuestion.count({ where: { openRoleId: roleId } });

  await db.roleQuestion.create({
    data: { openRoleId: roleId, ...parsed.data, order: count },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function deleteQuestion(questionId: string, roleId: string) {
  await requireRole("MASY_OPS");

  await db.roleQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const addCandidateSchema = z.object({
  name: z.string().min(1, "Candidate name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  yearsExperience: z.string().optional(),
  notes: z.string().optional(),
});

export async function addCandidate(roleId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = addCandidateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid candidate data");
  }

  const candidate = await db.candidate.create({
    data: {
      openRoleId: roleId,
      name: parsed.data.name,
      email: parsed.data.email || undefined,
      phone: parsed.data.phone,
      yearsExperience: parsed.data.yearsExperience,
      notes: parsed.data.notes,
      source: "MASY_SOURCED",
      stage: "APPLIED",
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "candidate.create",
      targetType: "Candidate",
      targetId: candidate.id,
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function updateCandidateStage(candidateId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const stage = z.enum(CANDIDATE_STAGES).safeParse(formData.get("stage"));
  if (!stage.success) throw new Error("Invalid stage");

  await db.candidate.update({ where: { id: candidateId }, data: { stage: stage.data } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function deleteCandidate(candidateId: string, roleId: string) {
  await requireRole("MASY_OPS");

  await db.candidate.delete({ where: { id: candidateId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function clearAllCandidates(roleId: string) {
  await requireRole("MASY_OPS");

  await db.candidate.deleteMany({ where: { openRoleId: roleId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}
