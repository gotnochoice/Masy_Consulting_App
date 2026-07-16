"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const ROLE_STAGES = ["SOURCING", "INTERVIEWING", "OFFER", "FILLED"] as const;
const CANDIDATE_STAGES = ["SOURCING", "INTERVIEWING", "OFFER", "FILLED", "REJECTED"] as const;

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

  const role = await db.openRole.create({ data: parsed.data });

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

const addCandidateSchema = z.object({
  name: z.string().min(1, "Candidate name is required"),
  notes: z.string().optional(),
});

export async function addCandidate(roleId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = addCandidateSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid candidate data");
  }

  const candidate = await db.candidate.create({
    data: { openRoleId: roleId, name: parsed.data.name, notes: parsed.data.notes },
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
