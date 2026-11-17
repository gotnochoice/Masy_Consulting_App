"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getClientIp } from "@/lib/application-rate-limit";
import { computeDocumentHash, generateSignedPdf } from "@/lib/esignature";
import { uploadEmployeeDocumentFile } from "@/lib/employee-documents-server";
import { put } from "@vercel/blob";

const PATH = "/me/onboarding/property-handover";

export type DisagreeState = { error: string } | undefined;

export async function raiseConditionDisagreement(
  assetId: string,
  _prevState: DisagreeState,
  formData: FormData,
): Promise<DisagreeState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const note = (formData.get("note") as string)?.trim();
  if (!note) return { error: "Describe what's different before submitting." };

  let photoUrl: string | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const result = await uploadEmployeeDocumentFile(photo);
    if ("error" in result) return { error: result.error };
    photoUrl = result.url;
  }

  const asset = await db.companyAsset.findFirst({ where: { id: assetId, employeeId } });
  if (!asset) return { error: "Equipment record not found." };

  await db.companyAsset.update({
    where: { id: assetId },
    data: {
      employeeDisagreesNote: note,
      employeeDisagreesPhotoUrls: photoUrl ? [...asset.employeeDisagreesPhotoUrls, photoUrl] : asset.employeeDisagreesPhotoUrls,
    },
  });

  revalidatePath(PATH);
}

export type SignHandoverState = { error: string } | undefined;

export async function signPropertyHandover(_prevState: SignHandoverState, formData: FormData): Promise<SignHandoverState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const typedName = (formData.get("typedName") as string)?.trim();
  if (!typedName) return { error: "Type your full name to sign." };
  const signatureImageDataUrl = formData.get("signatureImageDataUrl") as string;
  if (!signatureImageDataUrl) return { error: "Draw your signature above to sign." };
  if (formData.get("confirmLegal") !== "on") return { error: "Please confirm this is your legal signature." };

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!employee || !employee.user) return { error: "Employee login not found." };

  const assets = await db.companyAsset.findMany({ where: { employeeId, itemType: { not: "NO_EQUIPMENT_ISSUED" } } });
  if (assets.length === 0) return { error: "No equipment has been recorded yet." };
  const unverified = assets.filter((a) => !a.verifiedAt || !a.managementApprovedAt);
  if (unverified.length > 0) {
    return { error: "Your equipment hasn't been verified and approved by HR yet. Check back shortly." };
  }

  const existing = await db.eSignature.findFirst({ where: { employeeId, documentType: "PROPERTY_HANDOVER" } });
  if (existing) return { error: "Already signed." };

  const h = await headers();
  const ip = await getClientIp();
  const summaryText = assets
    .map((a) => `${a.itemType}${a.brand ? ` -- ${a.brand}` : ""}${a.model ? ` ${a.model}` : ""}${a.serialOrImei ? ` (Serial: ${a.serialOrImei})` : ""}`)
    .join("\n");
  const documentHash = computeDocumentHash(summaryText);
  const signedAt = new Date();

  let pdfUrl: string | undefined;
  try {
    const pdfBytes = await generateSignedPdf({
      title: "Company Property Handover",
      documentText: `Equipment issued to ${employee.name}:\n\n${summaryText}`,
      version: "1.0",
      signerName: employee.name,
      typedName,
      signerEmail: employee.user.email,
      ipAddress: ip,
      signedAt,
      documentHash,
      signatureImageDataUrl,
    });
    const blob = await put(`signed-documents/${employeeId}-PROPERTY_HANDOVER-${Date.now()}.pdf`, Buffer.from(pdfBytes), {
      access: "public",
      contentType: "application/pdf",
    });
    pdfUrl = blob.url;
  } catch (err) {
    console.error("[property-handover] failed to generate/upload signed PDF:", err);
  }

  await db.$transaction([
    db.eSignature.create({
      data: {
        employeeId,
        documentType: "PROPERTY_HANDOVER",
        typedName,
        signatureImageData: signatureImageDataUrl,
        ipAddress: ip,
        userAgent: h.get("user-agent") || null,
        documentHash,
        pdfUrl,
        signedAt,
      },
    }),
    db.companyAsset.updateMany({ where: { employeeId, itemType: { not: "NO_EQUIPMENT_ISSUED" } }, data: { status: "ISSUED" } }),
  ]);

  const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
  if (process) {
    await db.onboardingStep.update({
      where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "PROPERTY_HANDOVER" } },
      data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
    });
  }

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}
