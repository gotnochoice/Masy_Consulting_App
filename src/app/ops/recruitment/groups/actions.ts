"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uniqueApplicationGroupSlug } from "@/lib/slug";

const QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK", "MULTIPLE_CHOICE", "CHECKBOXES"] as const;

export async function createApplicationGroup(formData: FormData) {
  await requireRole("MASY_OPS");

  const clientOrgId = formData.get("clientOrgId");
  const title = formData.get("title");
  if (typeof clientOrgId !== "string" || !clientOrgId) throw new Error("Company is required");
  if (typeof title !== "string" || !title.trim()) throw new Error("Title is required");

  const slug = await uniqueApplicationGroupSlug(title, clientOrgId);

  const group = await db.applicationGroup.create({
    data: { clientOrgId, title: title.trim(), slug },
  });

  redirect(`/ops/recruitment/groups/${group.id}`);
}

export async function deleteApplicationGroup(groupId: string) {
  await requireRole("MASY_OPS");

  await db.applicationGroup.delete({ where: { id: groupId } });

  revalidatePath("/ops/recruitment/groups");
}

export async function updateApplicationGroupTitle(groupId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const title = formData.get("title");
  if (typeof title !== "string" || !title.trim()) throw new Error("Title is required");

  await db.applicationGroup.update({ where: { id: groupId }, data: { title: title.trim() } });

  revalidatePath(`/ops/recruitment/groups/${groupId}`);
}

export async function updateApplicationGroupRoles(groupId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const checkedIds = formData.getAll("roleIds").filter((v): v is string => typeof v === "string");

  await db.$transaction([
    db.openRole.updateMany({
      where: { applicationGroupId: groupId, id: { notIn: checkedIds } },
      data: { applicationGroupId: null },
    }),
    ...(checkedIds.length > 0
      ? [db.openRole.updateMany({ where: { id: { in: checkedIds } }, data: { applicationGroupId: groupId } })]
      : []),
  ]);

  revalidatePath(`/ops/recruitment/groups/${groupId}`);
}

const addQuestionSchema = z.object({
  label: z.string().min(1, "Question is required"),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
  options: z.string().optional(),
});

function parseOptions(type: (typeof QUESTION_TYPES)[number], raw: string | undefined) {
  if (type !== "MULTIPLE_CHOICE" && type !== "CHECKBOXES") return [];
  return (raw ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

async function nextQuestionOrder(applicationGroupId: string) {
  const last = await db.generalQuestion.findFirst({
    where: { applicationGroupId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function addGeneralQuestion(groupId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");

  await db.generalQuestion.create({
    data: {
      applicationGroupId: groupId,
      label: parsed.data.label,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parseOptions(parsed.data.type, parsed.data.options),
      order: await nextQuestionOrder(groupId),
    },
  });

  revalidatePath(`/ops/recruitment/groups/${groupId}`);
}

export async function updateGeneralQuestion(questionId: string, groupId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");

  await db.generalQuestion.update({
    where: { id: questionId },
    data: {
      label: parsed.data.label,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parseOptions(parsed.data.type, parsed.data.options),
    },
  });

  revalidatePath(`/ops/recruitment/groups/${groupId}`);
}

export async function deleteGeneralQuestion(questionId: string, groupId: string) {
  await requireRole("MASY_OPS");

  await db.generalQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/ops/recruitment/groups/${groupId}`);
}
