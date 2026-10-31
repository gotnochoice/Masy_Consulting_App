"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getReviewTemplate } from "@/lib/review-templates";
import { checkReviewQuality } from "@/lib/ai";

const schema = z.object({
  cycle: z.string().min(1, "Cycle is required"),
  selfAssessment: z.string().optional(),
});

export type SubmitReviewState = { error: string } | undefined;

export async function submitReview(_prevState: SubmitReviewState, formData: FormData): Promise<SubmitReviewState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record linked to this account" };

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const parsed = schema.safeParse({
    cycle: formData.get("cycle"),
    selfAssessment: formData.get("selfAssessment") || "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid review submission" };
  }

  const template = await getReviewTemplate(employeeId, employee.roleTitle, employee.reviewTemplate);
  const responses: { section: string; answers: { question: string; answer: string }[] }[] = [];
  for (const [si, section] of template.entries()) {
    const answers: { question: string; answer: string }[] = [];
    for (const [qi, question] of section.questions.entries()) {
      const raw = formData.get(`s${si}_q${qi}`);
      const answer = typeof raw === "string" ? raw.trim() : "";
      if (!answer) {
        return { error: `Please answer: "${question}"` };
      }
      answers.push({ question, answer });
    }
    responses.push({ section: section.section, answers });
  }

  // Catches a thin/one-word self-assessment before it's saved, so the employee can add
  // detail now instead of Masy discovering it's unusable later. If the quality check itself
  // fails for any reason (AI outage, missing key, etc.), that must never block a real
  // submission -- fail open and let it through.
  const quality = await checkReviewQuality(responses).catch((err) => {
    console.error("[submitReview] quality check failed, allowing submission:", err);
    return { hasIssue: false, message: "" };
  });
  if (quality.hasIssue) {
    return { error: quality.message || "A couple of your answers could use more detail before this is submitted." };
  }

  // A saved draft becomes the submission in place, so nothing already written is lost or
  // duplicated -- only one row ever exists per employee while they're still working on it.
  const draft = await db.performanceReview.findFirst({ where: { employeeId, status: "DRAFT" } });
  const data = { cycle: parsed.data.cycle, selfAssessment: parsed.data.selfAssessment || "", responses };
  if (draft) {
    await db.performanceReview.update({ where: { id: draft.id }, data: { ...data, status: "SUBMITTED" } });
  } else {
    await db.performanceReview.create({ data: { employeeId, ...data } });
  }

  revalidatePath("/me/reviews");
  redirect(`/me/reviews?done=${encodeURIComponent("Review submitted")}`);
}

export type SaveReviewDraftState = { savedAt: number } | { error: string } | undefined;

// Deliberately unvalidated -- a draft can be partial or even empty. This exists so an
// employee's typed answers are never lost: not to a rejected submission, a closed tab, or
// a dead session, since nothing here depends on the quality check or required fields.
export async function saveReviewDraft(
  _prevState: SaveReviewDraftState,
  formData: FormData,
): Promise<SaveReviewDraftState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record linked to this account" };

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const cycle = (formData.get("cycle") as string | null)?.trim() ?? "";
  const selfAssessment = (formData.get("selfAssessment") as string | null)?.trim() ?? "";

  const template = await getReviewTemplate(employeeId, employee.roleTitle, employee.reviewTemplate);
  const responses = template.map((section, si) => ({
    section: section.section,
    answers: section.questions.map((question, qi) => {
      const raw = formData.get(`s${si}_q${qi}`);
      return { question, answer: typeof raw === "string" ? raw.trim() : "" };
    }),
  }));

  const existing = await db.performanceReview.findFirst({ where: { employeeId, status: "DRAFT" } });
  if (existing) {
    await db.performanceReview.update({ where: { id: existing.id }, data: { cycle, selfAssessment, responses } });
  } else {
    await db.performanceReview.create({ data: { employeeId, cycle, selfAssessment, responses, status: "DRAFT" } });
  }

  revalidatePath("/me/reviews");
  return { savedAt: Date.now() };
}
