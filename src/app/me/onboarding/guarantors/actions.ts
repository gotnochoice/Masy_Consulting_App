"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { requiredGuarantorCount } from "@/lib/onboarding-process";

const PATH = "/me/onboarding/guarantors";

const guarantorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  occupation: z.string().optional(),
  address: z.string().min(1, "Contact address is required"),
  consent: z.literal("on", { message: "They must know they're listed and have agreed to be contacted" }),
});

export type SubmitGuarantorsState = { error: string } | undefined;

export async function submitGuarantors(
  _prevState: SubmitGuarantorsState,
  formData: FormData,
): Promise<SubmitGuarantorsState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  // Decided independently of anything the client sent -- never trust the form for how many
  // are actually required (equipment status, which drives this, can only be known server-side).
  const required = await requiredGuarantorCount(employeeId);

  const raw = Object.fromEntries(formData) as Record<string, string>;
  const toGuarantor = (prefix: "g1" | "g2") => ({
    name: raw[`${prefix}_name`],
    relationship: raw[`${prefix}_relationship`],
    phone: raw[`${prefix}_phone`],
    email: raw[`${prefix}_email`],
    occupation: raw[`${prefix}_occupation`],
    address: raw[`${prefix}_address`],
    consent: raw[`${prefix}_consent`],
  });

  const parsed1 = guarantorSchema.safeParse(toGuarantor("g1"));
  if (!parsed1.success) {
    return { error: parsed1.error.issues[0]?.message ?? "Please check those details." };
  }
  const guarantors = [parsed1.data];

  if (required === 2) {
    const parsed2 = guarantorSchema.safeParse(toGuarantor("g2"));
    if (!parsed2.success) {
      return { error: parsed2.error.issues[0]?.message ?? "Please check both guarantors' details." };
    }
    const samePerson =
      parsed1.data.phone.trim() === parsed2.data.phone.trim() ||
      parsed1.data.email.trim().toLowerCase() === parsed2.data.email.trim().toLowerCase() ||
      parsed1.data.name.trim().toLowerCase() === parsed2.data.name.trim().toLowerCase();
    if (samePerson) {
      return { error: "Your two guarantors must be different people -- they can't share a name, phone number, or email." };
    }
    guarantors.push(parsed2.data);
  }

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (!process) return { error: "No onboarding record found for this employee." };

  // Replace any prior attempt (e.g. after a "replace guarantor" request) rather than
  // accumulating rows -- this step only ever has exactly `required` current guarantors.
  await db.$transaction([
    db.guarantor.deleteMany({ where: { employeeId, replacedAt: null } }),
    db.guarantor.createMany({
      data: guarantors.map((g) => ({
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
