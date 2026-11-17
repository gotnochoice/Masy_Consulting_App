"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadEmployeeDocumentFile } from "@/lib/employee-documents-server";
import { encryptSensitive } from "@/lib/encryption";

const PATH = "/me/onboarding/identity-documents";
const NIN_REGEX = /^\d{11}$/;
const MAX_BILL_AGE_DAYS = 90; // 3 months, confirmed with Enny

async function requireProcessAndStep(employeeId: string) {
  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (!process) throw new Error("No onboarding record found for this employee.");
  return process;
}

export type SubmitIdentityDocumentsState = { error: string } | undefined;

export async function submitIdentityDocuments(
  _prevState: SubmitIdentityDocumentsState,
  formData: FormData,
): Promise<SubmitIdentityDocumentsState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const nin = (formData.get("nin") as string)?.trim();
  if (!NIN_REGEX.test(nin || "")) return { error: "NIN must be exactly 11 digits." };

  const idDocumentType = formData.get("idDocumentType") as string;
  if (idDocumentType !== "PASSPORT" && idDocumentType !== "DRIVERS_LICENSE") {
    return { error: "Choose which ID you're uploading." };
  }

  const idFront = formData.get("idFront");
  if (!(idFront instanceof File) || idFront.size === 0) return { error: "Upload the front of your ID." };
  const idBack = formData.get("idBack");
  if (idDocumentType === "DRIVERS_LICENSE" && (!(idBack instanceof File) || idBack.size === 0)) {
    return { error: "A driver's licence needs both front and back." };
  }

  const addressProofMode = formData.get("addressProofMode") as string;
  const addressFile = formData.get("addressFile");
  if (!(addressFile instanceof File) || addressFile.size === 0) {
    return { error: "Upload your proof of address." };
  }

  let billDate: Date | null = null;
  if (addressProofMode === "BILL") {
    const billDateStr = formData.get("billDate") as string;
    if (!billDateStr) return { error: "Enter the date on your bill." };
    billDate = new Date(billDateStr);
    const ageDays = (Date.now() - billDate.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_BILL_AGE_DAYS) {
      return { error: `That bill is dated more than 3 months ago. Please upload one dated within the last 3 months, or choose "I don't have one of these" below.` };
    }
    if (ageDays < 0) return { error: "That bill date is in the future -- please check it." };
  } else if (addressProofMode === "OTHER") {
    const note = (formData.get("otherProofNote") as string)?.trim();
    if (!note) return { error: "Briefly describe what this document is, so HR can review it." };
  } else {
    return { error: "Choose how you're proving your address." };
  }

  const process = await requireProcessAndStep(employeeId);

  const idResult = await uploadEmployeeDocumentFile(idFront);
  if ("error" in idResult) return { error: idResult.error };
  let idBackResult: { url: string } | null = null;
  if (idBack instanceof File && idBack.size > 0) {
    const r = await uploadEmployeeDocumentFile(idBack);
    if ("error" in r) return { error: r.error };
    idBackResult = r;
  }
  const addressResult = await uploadEmployeeDocumentFile(addressFile);
  if ("error" in addressResult) return { error: addressResult.error };

  const ninSlip = formData.get("ninSlip");
  let ninSlipResult: { url: string } | null = null;
  if (ninSlip instanceof File && ninSlip.size > 0) {
    const r = await uploadEmployeeDocumentFile(ninSlip);
    if ("error" in r) return { error: r.error };
    ninSlipResult = r;
  }

  const otherNote = (formData.get("otherProofNote") as string)?.trim();
  const addressLabel =
    addressProofMode === "BILL"
      ? "Proof of address (utility/phone bill)"
      : `Proof of address -- other (${otherNote}) -- needs HR review`;

  await db.$transaction([
    db.employee.update({ where: { id: employeeId }, data: { nin: encryptSensitive(nin) } }),
    db.employeeDocument.create({
      data: {
        employeeId,
        label: idDocumentType === "PASSPORT" ? "International passport" : "Driver's licence (front)",
        category: "IDENTIFICATION",
        idDocumentType,
        fileUrl: idResult.url,
        fileName: idFront.name,
        uploadedById: session.user.id,
      },
    }),
    ...(idBackResult
      ? [
          db.employeeDocument.create({
            data: {
              employeeId,
              label: "Driver's licence (back)",
              category: "IDENTIFICATION",
              idDocumentType,
              fileUrl: idBackResult.url,
              fileName: (idBack as File).name,
              uploadedById: session.user.id,
            },
          }),
        ]
      : []),
    db.employeeDocument.create({
      data: {
        employeeId,
        label: addressLabel,
        category: "PROOF_OF_ADDRESS",
        documentDate: billDate,
        fileUrl: addressResult.url,
        fileName: addressFile.name,
        uploadedById: session.user.id,
      },
    }),
    ...(ninSlipResult
      ? [
          db.employeeDocument.create({
            data: {
              employeeId,
              label: "NIN slip/card",
              category: "NIN_SLIP",
              fileUrl: ninSlipResult.url,
              fileName: (ninSlip as File).name,
              uploadedById: session.user.id,
            },
          }),
        ]
      : []),
    db.onboardingStep.update({
      where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "IDENTITY_DOCUMENTS" } },
      data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
    }),
  ]);

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}
