"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { resolveBankAccountName, namesReasonablyMatch, listNigerianBanks } from "@/lib/bank-verification";

const PATH = "/me/onboarding/personal-details";

export type VerifyBankState = { accountName: string } | { error: string } | undefined;

export async function verifyBankAccount(_prevState: VerifyBankState, formData: FormData): Promise<VerifyBankState> {
  await requireRole("EMPLOYEE");

  const accountNumber = (formData.get("bankAccountNumber") as string)?.trim();
  const bankCode = (formData.get("bankCode") as string)?.trim();
  if (!accountNumber || !bankCode) return { error: "Enter an account number and choose a bank first." };

  const result = await resolveBankAccountName(accountNumber, bankCode);
  if ("error" in result) return result;
  return { accountName: result.accountName };
}

const personalDetailsSchema = z.object({
  name: z.string().min(1, "Full legal name is required"),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(1, "Phone number is required"),
  whatsappNumber: z.string().optional(),
  personalEmail: z.string().email("A valid personal email is required"),
  address: z.string().min(1, "Residential address is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  bankAccountNumber: z.string().min(1, "Bank account number is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountHolderName: z.string().min(1, "Verify the account to get the account name"),
  confirmBankAccountIsMine: z.literal("on", { message: "Please confirm this bank account is yours" }),
  confirmWillUpdate: z.literal("on", { message: "Please confirm you'll keep our team updated" }),
});

export type SubmitPersonalDetailsState = { error: string } | undefined;

export async function submitPersonalDetails(
  _prevState: SubmitPersonalDetailsState,
  formData: FormData,
): Promise<SubmitPersonalDetailsState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const parsed = personalDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  // A manually-typed account holder name (bank verification not configured) is never treated
  // as a name match, however close it looks -- it hasn't actually been confirmed by anyone,
  // and HR needs to see that distinction rather than a false "MATCHED".
  const machineVerified = formData.get("bankMachineVerified") === "on";
  const matches = machineVerified && namesReasonablyMatch(parsed.data.name, parsed.data.bankAccountHolderName);

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (!process) return { error: "No onboarding record found for this employee." };

  await db.$transaction([
    db.employee.update({
      where: { id: employeeId },
      data: {
        name: parsed.data.name,
        preferredName: parsed.data.preferredName || null,
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        phone: parsed.data.phone,
        whatsappNumber: parsed.data.whatsappNumber || parsed.data.phone,
        personalEmail: parsed.data.personalEmail,
        address: parsed.data.address,
        emergencyContactName: parsed.data.emergencyContactName,
        emergencyContactPhone: parsed.data.emergencyContactPhone,
        bankAccountNumber: parsed.data.bankAccountNumber,
        bankName: parsed.data.bankName,
        bankAccountHolderName: parsed.data.bankAccountHolderName,
        bankNameMatchStatus: matches ? "MATCHED" : "NEEDS_REVIEW",
      },
    }),
    db.onboardingStep.update({
      where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "PERSONAL_DETAILS" } },
      data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
    }),
  ]);

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}

export type SaveDraftState = { savedAt: number } | undefined;

export async function saveDraft(_prevState: SaveDraftState, formData: FormData): Promise<SaveDraftState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return undefined;

  const fields = Object.fromEntries(formData) as Record<string, string>;
  await db.employee.update({
    where: { id: employeeId },
    data: {
      name: fields.name || undefined,
      preferredName: fields.preferredName || null,
      dateOfBirth: fields.dateOfBirth ? new Date(fields.dateOfBirth) : undefined,
      phone: fields.phone || null,
      whatsappNumber: fields.whatsappNumber || null,
      personalEmail: fields.personalEmail || null,
      address: fields.address || null,
      emergencyContactName: fields.emergencyContactName || null,
      emergencyContactPhone: fields.emergencyContactPhone || null,
    },
  });

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (process) {
    await db.onboardingStep.updateMany({
      where: { onboardingProcessId: process.id, stepType: "PERSONAL_DETAILS", status: "NOT_STARTED" },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath(PATH);
  return { savedAt: Date.now() };
}

export async function loadBankOptions() {
  await requireRole("EMPLOYEE");
  return listNigerianBanks();
}
