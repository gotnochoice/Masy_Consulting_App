"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getClientIp } from "@/lib/application-rate-limit";
import { computeDocumentHash, generateSignedPdf } from "@/lib/esignature";
import { notifyCountersignRequested } from "@/lib/onboarding-notify";
import { put } from "@vercel/blob";

const PATH = "/me/onboarding/signature";

export type SignDocumentState = { error: string } | undefined;

async function signDocument(
  documentType: "EMPLOYMENT_AGREEMENT" | "HANDBOOK",
  formData: FormData,
): Promise<SignDocumentState> {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) return { error: "No employee record found for this login." };

  const typedName = (formData.get("typedName") as string)?.trim();
  if (!typedName) return { error: "Type your full name to sign." };
  const signatureImageDataUrl = formData.get("signatureImageDataUrl") as string;
  if (!signatureImageDataUrl) return { error: "Draw your signature above to sign." };
  if (formData.get("confirmLegal") !== "on") {
    return { error: "Please confirm this is your legal signature." };
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { clientOrg: true, user: true } });
  if (!employee || !employee.user) return { error: "Employee login not found." };

  const text = documentType === "EMPLOYMENT_AGREEMENT" ? employee.clientOrg.employmentAgreementTemplate : employee.clientOrg.handbookText;
  const version = (documentType === "EMPLOYMENT_AGREEMENT" ? employee.clientOrg.employmentAgreementVersion : employee.clientOrg.handbookVersion) || "1.0";
  if (!text) return { error: "That document isn't set up yet. Contact your employer." };

  const existing = await db.eSignature.findFirst({
    where: { employeeId, documentType },
    orderBy: { version: "desc" },
  });
  if (existing && existing.signedAt) return { error: "Already signed." };

  const h = await headers();
  const ip = await getClientIp();
  const documentHash = computeDocumentHash(text);
  const signedAt = new Date();

  let pdfUrl: string | undefined;
  try {
    const pdfBytes = await generateSignedPdf({
      title: documentType === "EMPLOYMENT_AGREEMENT" ? "Employment Agreement" : "Employee Handbook",
      documentText: text,
      version,
      signerName: employee.name,
      typedName,
      signerEmail: employee.user.email,
      ipAddress: ip,
      signedAt,
      documentHash,
      signatureImageDataUrl,
    });
    const blob = await put(`signed-documents/${employeeId}-${documentType}-${Date.now()}.pdf`, Buffer.from(pdfBytes), {
      access: "public",
      contentType: "application/pdf",
    });
    pdfUrl = blob.url;
  } catch (err) {
    console.error("[signature] failed to generate/upload signed PDF:", err);
    // Still record the signature even if the PDF couldn't be generated/stored (e.g. no blob
    // token configured) -- the signature itself is the legally meaningful event, and the
    // audit trail (typed name, image, IP, hash, timestamp) is kept below either way.
  }

  await db.eSignature.create({
    data: {
      employeeId,
      documentType,
      version: 1,
      typedName,
      signatureImageData: signatureImageDataUrl,
      ipAddress: ip,
      userAgent: h.get("user-agent") || null,
      documentHash,
      pdfUrl,
      signedAt,
    },
  });

  const bothSigned = await db.eSignature.count({
    where: { employeeId, documentType: { in: ["EMPLOYMENT_AGREEMENT", "HANDBOOK"] } },
  });
  if (bothSigned >= 2) {
    const process = await db.onboardingProcess.findUnique({ where: { employeeId } });
    if (process) {
      await db.onboardingStep.update({
        where: { onboardingProcessId_stepType: { onboardingProcessId: process.id, stepType: "SIGNATURE" } },
        data: { status: "SUBMITTED", submittedAt: new Date(), correctionReason: null },
      });
      await notifyCountersignRequested(employeeId);
    }
  }

  revalidatePath(PATH);
  revalidatePath("/me/onboarding");
}

export async function signEmploymentAgreement(_prevState: SignDocumentState, formData: FormData): Promise<SignDocumentState> {
  return signDocument("EMPLOYMENT_AGREEMENT", formData);
}

export async function signHandbook(_prevState: SignDocumentState, formData: FormData): Promise<SignDocumentState> {
  return signDocument("HANDBOOK", formData);
}
