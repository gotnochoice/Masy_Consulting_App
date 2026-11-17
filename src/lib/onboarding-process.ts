import { db } from "@/lib/db";
import { ONBOARDING_STEP_ORDER } from "@/lib/onboarding";

// Creates the gate for a new employee: one OnboardingProcess row plus all six steps, each
// starting NOT_STARTED. Call this wherever an Employee row is created.
export async function createOnboardingProcess(employeeId: string, commencementDate: Date) {
  await db.onboardingProcess.create({
    data: {
      employeeId,
      commencementDate,
      steps: {
        create: ONBOARDING_STEP_ORDER.map((stepType) => ({ stepType })),
      },
    },
  });
}
