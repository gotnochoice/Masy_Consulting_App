"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uniqueRoleSlug } from "@/lib/slug";
import { generateShortCode } from "@/lib/short-code";
import { suggestRoleQuestions, type SuggestedQuestion } from "@/lib/ai";
import { sendNotification } from "@/lib/email";
import { rejectionEmail, interviewInviteEmail, offerEmail } from "@/lib/candidate-email-templates";

const ROLE_STAGES = ["SOURCING", "INTERVIEWING", "OFFER", "FILLED"] as const;
const CANDIDATE_STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"] as const;
const QUESTION_TYPES = ["SHORT_TEXT", "LONG_TEXT", "LINK", "MULTIPLE_CHOICE", "CHECKBOXES"] as const;

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
    data: { ...parsed.data, slug: await uniqueRoleSlug(parsed.data.title, parsed.data.clientOrgId) },
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

export async function deleteRole(roleId: string) {
  const session = await requireRole("MASY_OPS");

  await db.$transaction([
    db.candidate.deleteMany({ where: { openRoleId: roleId } }),
    db.openRole.delete({ where: { id: roleId } }),
  ]);

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.delete",
      targetType: "OpenRole",
      targetId: roleId,
    },
  });

  revalidatePath("/ops/recruitment");
}

export async function cloneRole(roleId: string) {
  const session = await requireRole("MASY_OPS");

  const source = await db.openRole.findUnique({
    where: { id: roleId },
    include: {
      questionSections: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!source) throw new Error("Role not found");

  const newTitle = `${source.title} (Copy)`;
  const newSlug = await uniqueRoleSlug(newTitle, source.clientOrgId);
  const newRoleId = await db.$transaction(async (tx) => {
    const newRole = await tx.openRole.create({
      data: {
        clientOrgId: source.clientOrgId,
        title: newTitle,
        slug: newSlug,
        description: source.description,
        location: source.location,
        acceptingApplications: true,
        askYearsExperience: source.askYearsExperience,
        askExpectedPay: source.askExpectedPay,
        askHowHeard: source.askHowHeard,
        askResumeLink: source.askResumeLink,
        askApplicantLocation: source.askApplicantLocation,
      },
    });

    const sectionIdMap = new Map<string, string>();
    for (const section of source.questionSections) {
      const newSection = await tx.questionSection.create({
        data: { openRoleId: newRole.id, title: section.title, order: section.order },
      });
      sectionIdMap.set(section.id, newSection.id);
    }

    for (const question of source.questions) {
      await tx.roleQuestion.create({
        data: {
          openRoleId: newRole.id,
          sectionId: question.sectionId ? (sectionIdMap.get(question.sectionId) ?? null) : null,
          label: question.label,
          type: question.type,
          options: question.options,
          required: question.required,
          order: question.order,
        },
      });
    }

    return newRole.id;
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.clone",
      targetType: "OpenRole",
      targetId: newRoleId,
    },
  });

  revalidatePath("/ops/recruitment");
  redirect(`/ops/recruitment/${newRoleId}`);
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

const updateLocationSchema = z.object({
  location: z.string().optional(),
});

export async function updateRoleLocation(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = updateLocationSchema.safeParse({ location: formData.get("location") || undefined });
  if (!parsed.success) throw new Error("Invalid location");

  await db.openRole.update({ where: { id: roleId }, data: { location: parsed.data.location } });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/recruitment");
}

const updateSchedulingLinkSchema = z.object({
  schedulingLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export async function updateRoleSchedulingLink(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = updateSchedulingLinkSchema.safeParse({ schedulingLink: formData.get("schedulingLink") || undefined });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid link");

  await db.openRole.update({
    where: { id: roleId },
    data: { schedulingLink: parsed.data.schedulingLink || null },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function updateRoleCustomInterviewMessage(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const customInterviewMessage = (formData.get("customInterviewMessage") as string | null)?.trim() || null;

  await db.openRole.update({
    where: { id: roleId },
    data: { customInterviewMessage },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function updateRoleCustomOfferMessage(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const customOfferMessage = (formData.get("customOfferMessage") as string | null)?.trim() || null;

  await db.openRole.update({
    where: { id: roleId },
    data: { customOfferMessage },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const updateTitleSchema = z.object({
  title: z.string().min(1, "Role title is required"),
});

export async function updateRoleTitle(roleId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = updateTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid role title");

  await db.openRole.update({ where: { id: roleId }, data: { title: parsed.data.title } });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.update_title",
      targetType: "OpenRole",
      targetId: roleId,
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/recruitment");
}

export async function getShortLink(roleId: string) {
  const session = await requireRole("MASY_OPS");

  const role = await db.openRole.findUnique({ where: { id: roleId }, select: { shortCode: true } });
  if (!role) throw new Error("Role not found");

  if (!role.shortCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateShortCode();
      try {
        await db.openRole.update({ where: { id: roleId }, data: { shortCode: code } });
        break;
      } catch (err) {
        if (attempt === 4) throw err;
      }
    }

    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "role.generate_short_link",
        targetType: "OpenRole",
        targetId: roleId,
      },
    });
  }

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function regenerateRoleSlug(roleId: string) {
  const session = await requireRole("MASY_OPS");

  const role = await db.openRole.findUnique({ where: { id: roleId }, select: { title: true, clientOrgId: true } });
  if (!role) throw new Error("Role not found");

  await db.openRole.update({
    where: { id: roleId },
    data: { slug: await uniqueRoleSlug(role.title, role.clientOrgId) },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.regenerate_slug",
      targetType: "OpenRole",
      targetId: roleId,
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/recruitment");
}

const updateCompanySchema = z.object({
  clientOrgId: z.string().min(1, "Company is required"),
});

export async function updateRoleCompany(roleId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = updateCompanySchema.safeParse({ clientOrgId: formData.get("clientOrgId") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid company");

  const role = await db.openRole.findUnique({ where: { id: roleId }, select: { title: true } });
  if (!role) throw new Error("Role not found");

  await db.openRole.update({
    where: { id: roleId },
    data: {
      clientOrgId: parsed.data.clientOrgId,
      slug: await uniqueRoleSlug(role.title, parsed.data.clientOrgId),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "role.update_company",
      targetType: "OpenRole",
      targetId: roleId,
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/recruitment");
}

export async function updateRoleDefaultFields(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  await db.openRole.update({
    where: { id: roleId },
    data: {
      askYearsExperience: formData.get("askYearsExperience") === "on",
      askExpectedPay: formData.get("askExpectedPay") === "on",
      askHowHeard: formData.get("askHowHeard") === "on",
      askResumeLink: formData.get("askResumeLink") === "on",
      askApplicantLocation: formData.get("askApplicantLocation") === "on",
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const addQuestionSchema = z.object({
  label: z.string().min(1, "Question is required"),
  type: z.enum(QUESTION_TYPES),
  required: z.boolean(),
  options: z.string().optional(),
  sectionId: z.string().optional(),
});

function parseOptions(type: (typeof QUESTION_TYPES)[number], raw: string | undefined) {
  if (type !== "MULTIPLE_CHOICE" && type !== "CHECKBOXES") return [];
  return (raw ?? "")
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
}

async function nextQuestionOrder(roleId: string) {
  const last = await db.roleQuestion.findFirst({
    where: { openRoleId: roleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function addQuestion(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
    sectionId: formData.get("sectionId") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");
  }

  await db.roleQuestion.create({
    data: {
      openRoleId: roleId,
      label: parsed.data.label,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parseOptions(parsed.data.type, parsed.data.options),
      sectionId: parsed.data.sectionId || null,
      order: await nextQuestionOrder(roleId),
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function updateQuestion(questionId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = addQuestionSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
    sectionId: formData.get("sectionId") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");
  }

  await db.roleQuestion.update({
    where: { id: questionId },
    data: {
      label: parsed.data.label,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parseOptions(parsed.data.type, parsed.data.options),
      sectionId: parsed.data.sectionId || null,
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function deleteQuestion(questionId: string, roleId: string) {
  await requireRole("MASY_OPS");

  await db.roleQuestion.delete({ where: { id: questionId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function moveQuestionToSection(questionId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const sectionId = formData.get("sectionId");
  await db.roleQuestion.update({
    where: { id: questionId },
    data: { sectionId: typeof sectionId === "string" && sectionId ? sectionId : null },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function moveQuestion(questionId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const direction = formData.get("direction");
  if (direction !== "up" && direction !== "down") throw new Error("Invalid direction");

  const moving = await db.roleQuestion.findUnique({ where: { id: questionId }, select: { sectionId: true } });
  if (!moving) return;

  const siblings = await db.roleQuestion.findMany({
    where: { openRoleId: roleId, sectionId: moving.sectionId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const index = siblings.findIndex((q) => q.id === questionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const current = siblings[index];
  const swapWith = siblings[swapIndex];

  await db.$transaction([
    db.roleQuestion.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.roleQuestion.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const sectionTitleSchema = z.object({
  title: z.string().min(1, "Section title is required"),
});

async function nextSectionOrder(roleId: string) {
  const last = await db.questionSection.findFirst({
    where: { openRoleId: roleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function createQuestionSection(roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = sectionTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid section");
  }

  await db.questionSection.create({
    data: {
      openRoleId: roleId,
      title: parsed.data.title,
      order: await nextSectionOrder(roleId),
    },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function renameQuestionSection(sectionId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const parsed = sectionTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid section");
  }

  await db.questionSection.update({ where: { id: sectionId }, data: { title: parsed.data.title } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function deleteQuestionSection(sectionId: string, roleId: string) {
  await requireRole("MASY_OPS");

  // Questions in this section fall back to ungrouped (sectionId set to null via the DB's
  // onDelete: SetNull), they are not deleted along with the section.
  await db.questionSection.delete({ where: { id: sectionId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export async function moveQuestionSection(sectionId: string, roleId: string, formData: FormData) {
  await requireRole("MASY_OPS");

  const direction = formData.get("direction");
  if (direction !== "up" && direction !== "down") throw new Error("Invalid direction");

  const sections = await db.questionSection.findMany({
    where: { openRoleId: roleId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const index = sections.findIndex((s) => s.id === sectionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= sections.length) return;

  const current = sections[index];
  const swapWith = sections[swapIndex];

  await db.$transaction([
    db.questionSection.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    db.questionSection.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath(`/ops/recruitment/${roleId}`);
}

export type SuggestQuestionsState = { suggestions: SuggestedQuestion[] } | { error: string } | undefined;

// useActionState requires this exact (state, formData) signature, even though neither is read here.
export async function suggestQuestionsForRole(
  roleId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: SuggestQuestionsState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  formData: FormData,
): Promise<SuggestQuestionsState> {
  await requireRole("MASY_OPS");

  const role = await db.openRole.findUnique({ where: { id: roleId } });
  if (!role) return { error: "Role not found" };

  try {
    const suggestions = await suggestRoleQuestions(role.title, role.description);
    if (suggestions.length === 0) {
      return { error: "Couldn't generate suggestions. Try adding a role description first." };
    }
    return { suggestions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong generating suggestions." };
  }
}

const suggestedQuestionsSchema = z.array(
  z.object({
    label: z.string().min(1),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean(),
  }),
);

export async function addSuggestedQuestions(roleId: string, questions: SuggestedQuestion[]) {
  await requireRole("MASY_OPS");

  const parsed = suggestedQuestionsSchema.safeParse(questions);
  if (!parsed.success || parsed.data.length === 0) return;

  const start = await nextQuestionOrder(roleId);

  await db.roleQuestion.createMany({
    data: parsed.data.map((q, i) => ({
      openRoleId: roleId,
      label: q.label,
      type: q.type,
      required: q.required,
      order: start + i,
    })),
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

const addCandidateSchema = z.object({
  name: z.string().min(1, "Candidate name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  yearsExperience: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function addCandidate(roleId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const parsed = addCandidateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
    location: formData.get("location") || undefined,
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
      location: parsed.data.location,
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
  revalidatePath("/ops/applicants");
  revalidatePath(`/ops/applicants/${candidateId}`);
}

export async function deleteCandidate(candidateId: string, roleId: string) {
  await requireRole("MASY_OPS");

  await db.candidate.delete({ where: { id: candidateId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath("/ops/applicants");
}

export async function clearAllCandidates(roleId: string) {
  await requireRole("MASY_OPS");

  await db.candidate.deleteMany({ where: { openRoleId: roleId } });

  revalidatePath(`/ops/recruitment/${roleId}`);
}

async function loadCandidateForEmail(candidateId: string) {
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    include: { openRole: { include: { clientOrg: true } } },
  });
  if (!candidate) throw new Error("Candidate not found");
  if (!candidate.email) throw new Error(`${candidate.name} has no email address on file`);
  return candidate;
}

export async function sendCandidateRejectionEmail(candidateId: string, roleId: string) {
  const session = await requireRole("MASY_OPS");
  const candidate = await loadCandidateForEmail(candidateId);

  const { subject, body } = rejectionEmail(candidate.name, candidate.openRole.title, candidate.openRole.clientOrg.name);
  await sendNotification(candidate.email!, subject, body);

  await db.candidate.update({ where: { id: candidateId }, data: { rejectionEmailSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId: session.user.id, action: "candidate.send_rejection_email", targetType: "Candidate", targetId: candidateId },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath(`/ops/applicants/${candidateId}`);
}

export async function sendCandidateInterviewInviteEmail(candidateId: string, roleId: string) {
  const session = await requireRole("MASY_OPS");
  const candidate = await loadCandidateForEmail(candidateId);

  const { subject, body } = interviewInviteEmail(
    candidate.name,
    candidate.openRole.title,
    candidate.openRole.clientOrg.name,
    candidate.openRole.schedulingLink,
    candidate.openRole.customInterviewMessage,
  );
  await sendNotification(candidate.email!, subject, body);

  await db.candidate.update({ where: { id: candidateId }, data: { interviewInviteSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId: session.user.id, action: "candidate.send_interview_invite", targetType: "Candidate", targetId: candidateId },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath(`/ops/applicants/${candidateId}`);
}

export async function sendCandidateOfferEmail(candidateId: string, roleId: string) {
  const session = await requireRole("MASY_OPS");
  const candidate = await loadCandidateForEmail(candidateId);

  const { subject, body } = offerEmail(
    candidate.name,
    candidate.openRole.title,
    candidate.openRole.clientOrg.name,
    candidate.openRole.customOfferMessage,
  );
  await sendNotification(candidate.email!, subject, body);

  await db.candidate.update({ where: { id: candidateId }, data: { offerEmailSentAt: new Date() } });
  await db.auditLog.create({
    data: { actorId: session.user.id, action: "candidate.send_offer_email", targetType: "Candidate", targetId: candidateId },
  });

  revalidatePath(`/ops/recruitment/${roleId}`);
  revalidatePath(`/ops/applicants/${candidateId}`);
}
