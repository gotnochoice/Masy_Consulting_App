"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

const PATH = "/me/onboarding/guarantors";

const guarantorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  occupation: z.string().optional(),
  address: z.string().min(1, "Contact address is required"),
  consent: z.literal("on", { message: "The guarantor must know they're being listed and have agreed to be contacted" }),
});

const submitSchema = z.object({
  guarantor1: guarantorSchema,
  guarantor2: guarantorSchema,
});

export type SubmitGuarantorsState = { error: string } | undefined;

export async function submitGuarantors(
  _prevState: SubmitGuarantorsState,
  formData: FormData,
): Promise<SubmitGuarantorsState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = submitSchema.safeParse({
    guarantor1: {
      name: raw.g1_name,
      relationship: raw.g1_relationship,
      phone: raw.g1_phone,
      email: raw.g1_email,
      occupation: raw.g1_occupation,
      address: raw.g1_address,
      consent: raw.g1_consent,
    },
    guarantor2: {
      name: raw.g2_name,
      relationship: raw.g2_relationship,
      phone: raw.g2_phone,
      email: raw.g2_email,
      occupation: raw.g2_occupation,
      address: raw.g2_address,
      consent: raw.g2_consent,
    },
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check both guarantors' details." };
  }

  const { guarantor1, guarantor2 } = parsed.data;
  const samePerson =
    guarantor1.phone.trim() === guarantor2.phone.trim() ||
    guarantor1.email.trim().toLowerCase() === guarantor2.email.trim().toLowerCase() ||
    guarantor1.name.trim().toLowerCase() === guarantor2.name.trim().toLowerCase();
  if (samePerson) {
    return { error: "Your two guarantors must be different people -- they can't share a name, phone number, or email." };
  }

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (!process) return { error: "No onboarding record found for this employee." };

  // Replace any prior attempt (e.g. after a "replace guarantor" request) rather than
  // accumulating rows -- this step only ever has exactly two current guarantors.
  await db.$transaction([
    db.guarantor.deleteMany({ where: { employeeId, replacedAt: null } }),
    db.guarantor.createMany({
      data: [guarantor1, guarantor2].map((g) => ({
        employeeId,
        name: g.name,
        relationship: g.relationship,
        phone: g.phone,
        email: g.email,
        occupation: g.occupation || null,
        address: g.address,
        consentConfirmed: true,
      })),
    }),
    db.onboardingStep.update({
      where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "GUARANTORS" } },
      data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
    }),
  ]);

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}
