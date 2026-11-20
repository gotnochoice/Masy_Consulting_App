import { db } from "@/lib/db";
import { ONBOARDING_STEP_ORDER } from "@/lib/onboarding";

// A guarantor exists to back the equipment a company hands out -- if nothing's being issued,
// there's nothing to guarantee, so one next-of-kin contact is enough instead of two full
// guarantors. Equipment status is whatever Ops has recorded by the time this is checked; with
// nothing recorded yet, default to the safer two-guarantor requirement rather than assuming
// "none."
export async function requiredGuarantorCount(employeeId: string): Promise<1 | 2> {
  const noEquipmentSentinel = await db.companyAsset.findFirst({
    where: { employeeId, itemType: "NO_EQUIPMENT_ISSUED" },
    select: { id: true },
  });
  return noEquipmentSentinel ? 1 : 2;
}

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
