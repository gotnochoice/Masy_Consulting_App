"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getReviewTemplate } from "@/lib/review-templates";

const schema = z.object({
  cycle: z.string().min(1, "Cycle is required"),
  selfAssessment: z.string().optional(),
});

export async function submitReview(formData: FormData) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found");

  const parsed = schema.safeParse({
    cycle: formData.get("cycle"),
    selfAssessment: formData.get("selfAssessment") || "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid review submission");
  }

  const template = await getReviewTemplate(employeeId, employee.roleTitle, employee.reviewTemplate);
  const responses = template.map((section, si) => ({
    section: section.section,
    answers: section.questions.map((question, qi) => {
      const raw = formData.get(`s${si}_q${qi}`);
      const answer = typeof raw === "string" ? raw.trim() : "";
      if (!answer) {
        throw new Error(`Please answer: "${question}"`);
      }
      return { question, answer };
    }),
  }));

  await db.performanceReview.create({
    data: {
      employeeId,
      cycle: parsed.data.cycle,
      selfAssessment: parsed.data.selfAssessment || "",
      responses,
    },
  });

  revalidatePath("/me/reviews");
  redirect(`/me/reviews?done=${encodeURIComponent("Review submitted")}`);
}
