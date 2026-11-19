"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getClientIp } from "@/lib/application-rate-limit";
import { ONBOARDING_STEP_ORDER } from "@/lib/onboarding";
import { notifyOnboardingComplete } from "@/lib/onboarding-notify";
import { requiredGuarantorCount } from "@/lib/onboarding-process";

const PATH = "/ops/onboarding";

export async function verifyOnboardingStep(stepId: string) {
  const session = await requireRole("MASY_OPS");

  const step = await db.onboardingStep.findUnique({ where: { id: stepId }, include: { onboardingProcess: true } });
  if (!step) throw new Error("Step not found");

  if (step.stepType === "GUARANTORS") {
    const employeeId = step.onboardingProcess.employeeId;
    const [guarantors, required] = await Promise.all([
      db.guarantor.findMany({ where: { employeeId, replacedAt: null }, include: { verificationLogs: true } }),
      requiredGuarantorCount(employeeId),
    ]);
    const allVerified = guarantors.length === required && guarantors.every((g) => g.verificationLogs.some((l) => l.result === "VERIFIED"));
    if (!allVerified) {
      throw new Error(
        required === 1
          ? "The next-of-kin contact needs a verification log entry marked VERIFIED first."
          : "Both guarantors need a verification log entry marked VERIFIED first.",
      );
    }
  }

  await db.onboardingStep.update({
    where: { id: stepId },
    data: { status: "VERIFIED", verifiedAt: new Date(), verifiedById: session.user.id, correctionReason: null },
  });

  revalidatePath(PATH);
}

export type RequestCorrectionState = { error: string } | undefined;

export async function requestStepCorrection(
  stepId: string,
  _prevState: RequestCorrectionState,
  formData: FormData,
): Promise<RequestCorrectionState> {
  await requireRole("MASY_OPS");

  const reason = (formData.get("reason") as string)?.trim();
  if (!reason) return { error: "Describe what needs to change." };

  await db.onboardingStep.update({
    where: { id: stepId },
    data: { status: "NEEDS_CORRECTION", correctionReason: reason, correctionRequestedAt: new Date() },
  });

  revalidatePath(PATH);
}

const guarantorLogSchema = ["method", "result"];

export async function addGuarantorVerificationLog(guarantorId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const method = formData.get("method") as string;
  const result = formData.get("result") as string;
  if (!guarantorLogSchema.every((f) => formData.get(f))) throw new Error("Method and result are required.");

  await db.guarantorVerificationLog.create({
    data: {
      guarantorId,
      verifiedById: session.user.id,
      method: method as "PHONE_CALL" | "EMAIL" | "OTHER",
      result: result as "PENDING" | "VERIFIED" | "FAILED",
      followUpNeeded: formData.get("followUpNeeded") === "on",
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath(PATH);
}

export async function requestGuarantorReplacement(guarantorId: string) {
  await requireRole("MASY_OPS");

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  await db.guarantor.update({ where: { id: guarantorId }, data: { replacedAt: new Date(), replacementDeadline: deadline } });

  revalidatePath(PATH);
}

// The employer's countersignature on the agreement and handbook. Simplified from the original
// "separate link" to a direct action here, since Ops/HR already works from this authenticated
// queue -- the signatures themselves (typed name + IP + timestamp) still carry the same audit
// weight as the employee's own.
export async function countersignDocuments(employeeId: string, formData: FormData) {
  const session = await requireRole("MASY_OPS");

  const typedName = (formData.get("typedName") as string)?.trim();
  if (!typedName) throw new Error("Type a name to countersign.");

  const ip = await getClientIp();
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.eSignature.updateMany({
      where: { employeeId, documentType: { in: ["EMPLOYMENT_AGREEMENT", "HANDBOOK"] }, countersignedAt: null },
      data: { countersignedById: session.user.id, countersignedAt: now, countersignIpAddress: ip },
    });

    const process = await tx.onboardingProcess.findUnique({ where: { employeeId } });
    if (process) {
      await tx.onboardingStep.update({
        where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "SIGNATURE" } },
        data: { status: "VERIFIED", verifiedAt: now, verifiedById: session.user.id },
      });
    }
  });

  revalidatePath(PATH);
}

export type CompleteOnboardingState = { error: string } | undefined;

export async function completeOnboarding(employeeId: string): Promise<CompleteOnboardingState> {
  const session = await requireRole("MASY_OPS");

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) return { error: "No onboarding record found." };

  const missing = ONBOARDING_STEP_ORDER.filter(
    (stepType) => process.steps.find((s) => s.stepType === stepType)?.status !== "VERIFIED",
  );
  if (missing.length > 0) {
    return { error: `Every step must be verified first. Still pending: ${missing.join(", ")}` };
  }

  await db.$transaction([
    db.onboardingProcess.update({
      where: { id: process.id },
      data: { completedAt: new Date(), completedById: session.user.id },
    }),
    db.onboardingTask.createMany({
      data: [30, 60, 90].map((days) => ({ employeeId, label: `Day ${days} review` })),
    }),
  ]);

  await notifyOnboardingComplete(employeeId);

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}

export async function toggleOnboardingTask(taskId: string) {
  await requireRole("MASY_OPS");

  const task = await db.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  await db.onboardingTask.update({ where: { id: taskId }, data: { done: !task.done } });

  revalidatePath("/ops/onboarding");
}
