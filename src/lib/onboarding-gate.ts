import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// The gate: every /me/* page except the onboarding flow itself calls this first. An employee
// with an incomplete OnboardingProcess is sent straight to /me/onboarding and never sees
// attendance, leave, reviews, etc. until HR has verified every step.
export async function requireOnboardingComplete(employeeId: string | null | undefined) {
  if (!employeeId) return;

  const process = await db.onboardingProcess.findUnique({
    where: { employeeId },
    select: { completedAt: true },
  });

  // No OnboardingProcess at all means this employee predates the onboarding module --
  // nothing to gate on, let them through rather than locking out existing staff.
  if (process && !process.completedAt) {
    redirect("/me/onboarding");
  }
}
