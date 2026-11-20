"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function recordPrivacyConsent() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return;

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (!process) return;

  await db.onboardingProcess.update({
    where: { id: process.id },
    data: { privacyConsentAt: new Date() },
  });

  revalidatePath("/me/onboarding");
}
