import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ONBOARDING_STEP_ORDER } from "@/lib/onboarding";

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

// Guards each individual step page: if the early privacy-consent notice hasn't been
// acknowledged yet, bounce back to the overview page, which shows that notice first. Prevents
// reaching a step directly by URL before any personal-data collection has been consented to.
export async function requirePrivacyConsent(employeeId: string | null | undefined) {
  if (!employeeId) return;

  const process = await db.onboardingProcess.findUnique({
    where: { employeeId },
    select: { privacyConsentAt: true },
  });

  if (process && !process.privacyConsentAt) {
    redirect("/me/onboarding");
  }
}

// Each step page only guarded against reaching it before the early privacy notice, never
// against reaching it before the steps that come before it -- so typing /me/onboarding/signature
// into the address bar skipped straight past personal details, identity documents, guarantors,
// and acknowledgments entirely. The overview page's own "locked" styling only stops clicking a
// link there; it was never enforced on the step pages themselves. This is.
export async function requirePriorStepsComplete(
  employeeId: string | null | undefined,
  stepType: (typeof ONBOARDING_STEP_ORDER)[number],
) {
  if (!employeeId) return;

  const idx = ONBOARDING_STEP_ORDER.indexOf(stepType);
  if (idx <= 0) return;

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) return;

  for (let i = 0; i < idx; i++) {
    const prior = process.steps.find((s) => s.stepType === ONBOARDING_STEP_ORDER[i]);
    if (!prior || (prior.status !== "SUBMITTED" && prior.status !== "VERIFIED")) {
      redirect("/me/onboarding");
    }
  }
}
