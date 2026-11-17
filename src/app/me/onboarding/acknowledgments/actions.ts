"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { KEY_TERM_ITEMS } from "@/lib/onboarding";

const PATH = "/me/onboarding/acknowledgments";

async function getEmployeeAndOrg(employeeId: string) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { clientOrg: true },
  });
  if (!employee) throw new Error("Employee not found");
  return employee;
}

export async function acknowledgeDocument(
  documentType: "EMPLOYMENT_AGREEMENT" | "HANDBOOK" | "PRIVACY_NOTICE",
  version: string,
  timeSpentSeconds: number,
) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return;

  await db.documentAcknowledgment.upsert({
    where: { employeeId_documentType_version: { employeeId, documentType, version } },
    create: { employeeId, documentType, version, scrolledToEnd: true, timeSpentSeconds, acknowledgedAt: new Date() },
    update: { scrolledToEnd: true, timeSpentSeconds, acknowledgedAt: new Date() },
  });

  revalidatePath(PATH);
}

export type SaveKeyTermsState = { error: string } | undefined;

export async function saveKeyTerms(_prevState: SaveKeyTermsState, formData: FormData): Promise<SaveKeyTermsState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const missing = KEY_TERM_ITEMS.find((item) => formData.get(item.key) !== "on");
  if (missing) return { error: "Please confirm every line before continuing." };
  if (formData.get("shift_confirmation") !== "on") {
    return { error: "Please confirm your shift before continuing." };
  }

  await db.$transaction(
    [...KEY_TERM_ITEMS.map((i) => i.key), "shift_confirmation"].map((termKey) =>
      db.keyTermAcknowledgment.upsert({
        where: { employeeId_termKey: { employeeId, termKey } },
        create: { employeeId, termKey },
        update: { acknowledgedAt: new Date() },
      }),
    ),
  );

  revalidatePath(PATH);
}

export type QuizAttemptState =
  | { passed: true }
  | { passed: false; wrongQuestionIds: string[]; explanations: Record<string, string> }
  | { error: string }
  | undefined;

export async function submitQuizAttempt(_prevState: QuizAttemptState, formData: FormData): Promise<QuizAttemptState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const employee = await getEmployeeAndOrg(employeeId);
  const questions = await db.comprehensionQuestion.findMany({
    where: { clientOrgId: employee.clientOrgId, active: true },
    orderBy: { order: "asc" },
  });
  if (questions.length === 0) return { error: "No quiz questions are set up yet. Contact HR." };

  const answers: Record<string, number> = {};
  const wrongQuestionIds: string[] = [];
  const explanations: Record<string, string> = {};
  for (const q of questions) {
    const selected = Number(formData.get(`q_${q.id}`));
    answers[q.id] = selected;
    if (selected !== q.correctChoiceIndex) {
      wrongQuestionIds.push(q.id);
      explanations[q.id] = q.explanation || "";
    }
  }

  const passed = wrongQuestionIds.length === 0;

  await db.comprehensionAttempt.create({
    data: { employeeId, answers, score: Math.round(((questions.length - wrongQuestionIds.length) / questions.length) * 100), passed },
  });

  if (passed) {
    const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
    if (process) {
      await db.onboardingStep.update({
        where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "ACKNOWLEDGMENTS" } },
        data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
      });
    }
    revalidatePath(PATH);
    revalidatePath("/me/onboarding");
    return { passed: true };
  }

  return { passed: false, wrongQuestionIds, explanations };
}
