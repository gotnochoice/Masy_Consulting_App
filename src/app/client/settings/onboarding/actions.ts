"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import mammoth from "mammoth";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { uploadClientLogo, MAX_LOGO_FILE_BYTES, MAX_LOGO_FILE_LABEL } from "@/lib/logo";
import { MAX_TEMPLATE_FILE_BYTES, MAX_TEMPLATE_FILE_LABEL } from "@/lib/contract-letter-template-constants";
import { MAX_DOCUMENT_FILE_BYTES, MAX_DOCUMENT_FILE_LABEL } from "@/lib/employee-documents";
import {
  transcribeDocumentText,
  draftEmploymentAgreement,
  draftHandbook,
  generateComprehensionQuiz,
  type EmploymentAgreementBrief,
  type HandbookBrief,
} from "@/lib/ai";

const PATH = "/client/settings/onboarding";

// Any change to the agreement, handbook, or quiz content invalidates the "reviewed" sign-off --
// the next real onboarding can't start on a Step 4 that was edited after someone last confirmed
// it was checked.
async function clearReviewedFlag(clientOrgId: string) {
  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { onboardingContentReviewedAt: null, onboardingContentReviewedById: null },
  });
}

async function extractTextFromUpload(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return transcribeDocumentText({ mimeType: "application/pdf", data: buffer.toString("base64") });
  }
  return buffer.toString("utf-8");
}

const letterheadSchema = z.object({
  companyLegalName: z.string().min(1, "Company legal name is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  signatoryName: z.string().min(1, "Signatory name is required"),
  signatoryTitle: z.string().min(1, "Signatory title is required"),
  onboardingCountersignerRole: z.enum(["FOUNDER_OR_CLIENT_ADMIN", "HR_MASY"]),
});

export type LetterheadState = { error: string } | undefined;

export async function updateLetterhead(_prevState: LetterheadState, formData: FormData): Promise<LetterheadState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const parsed = letterheadSchema.safeParse({
    companyLegalName: formData.get("companyLegalName"),
    companyAddress: formData.get("companyAddress"),
    signatoryName: formData.get("signatoryName"),
    signatoryTitle: formData.get("signatoryTitle"),
    onboardingCountersignerRole: formData.get("onboardingCountersignerRole"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the letterhead details." };
  }

  let logoUrl: string | undefined;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_FILE_BYTES) {
      return { error: `That logo is too large. Please keep it under ${MAX_LOGO_FILE_LABEL}.` };
    }
    const result = await uploadClientLogo(logoFile);
    if ("error" in result) return { error: result.error };
    logoUrl = result.url;
  }

  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { ...parsed.data, ...(logoUrl ? { letterheadLogoUrl: logoUrl, logoUrl } : {}) },
  });

  revalidatePath(PATH);
}

export type AgreementDraftState = { draft: string } | { error: string } | undefined;

export async function draftAgreementWithAi(
  _prevState: AgreementDraftState,
  formData: FormData,
): Promise<AgreementDraftState> {
  const session = await requireRole("CLIENT");
  const org = await db.clientOrg.findUnique({
    where: { id: session.user.clientOrgId! },
    select: { name: true, employmentAgreementTemplate: true },
  });
  if (!org) return { error: "Company not found" };

  const brief: EmploymentAgreementBrief = {
    companyName: org.name,
    workMode: (formData.get("workMode") as EmploymentAgreementBrief["workMode"]) || "REMOTE",
    shiftDescription: (formData.get("shiftDescription") as string) || null,
    payStructure: (formData.get("payStructure") as string) || "Not specified",
    probationAndNotice: (formData.get("probationAndNotice") as string) || null,
    leavePolicy: (formData.get("leavePolicy") as string) || null,
    equipmentPolicy: (formData.get("equipmentPolicy") as string) || null,
    otherTerms: (formData.get("otherTerms") as string) || null,
    existingText: org.employmentAgreementTemplate || null,
  };

  try {
    const draft = await draftEmploymentAgreement(brief);
    return { draft };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong drafting the agreement." };
  }
}

export type SaveTextState = { error: string } | { savedAt: number } | undefined;

export async function saveAgreementText(_prevState: SaveTextState, formData: FormData): Promise<SaveTextState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;
  const text = (formData.get("text") as string) || "";
  if (!text.trim()) return { error: "The agreement can't be empty." };

  const org = await db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { employmentAgreementVersion: true } });
  const nextVersion = (Number(org?.employmentAgreementVersion ?? "1.0") + 0.1).toFixed(1);

  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { employmentAgreementTemplate: text, employmentAgreementVersion: nextVersion },
  });
  await clearReviewedFlag(clientOrgId);
  revalidatePath(PATH);
  return { savedAt: Date.now() };
}

// Returns the extracted text for review, same as the AI drafting actions -- nothing is saved
// until the client reviews it in the editor and presses Save, since OCR/transcription of a
// pasted document is never guaranteed perfect.
export type UploadDocumentState = { draft: string } | { error: string } | undefined;

export async function uploadAgreementDocument(
  _prevState: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  await requireRole("CLIENT");

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a document to upload first." };
  if (file.size > MAX_TEMPLATE_FILE_BYTES) return { error: `That file is too large. Please keep it under ${MAX_TEMPLATE_FILE_LABEL}.` };

  try {
    const text = await extractTextFromUpload(file);
    if (!text.trim()) return { error: "Couldn't find any text in that document." };
    return { draft: text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong reading that document." };
  }
}

export type HandbookDraftState = { draft: string } | { error: string } | undefined;

export async function draftHandbookWithAi(
  _prevState: HandbookDraftState,
  formData: FormData,
): Promise<HandbookDraftState> {
  const session = await requireRole("CLIENT");
  const org = await db.clientOrg.findUnique({
    where: { id: session.user.clientOrgId! },
    select: { name: true, handbookText: true },
  });
  if (!org) return { error: "Company not found" };

  const input: HandbookBrief = {
    companyName: org.name,
    workMode: (formData.get("workMode") as HandbookBrief["workMode"]) || "REMOTE",
    brief: (formData.get("brief") as string) || "",
    existingText: org.handbookText || null,
  };
  if (!input.brief.trim()) return { error: "Tell us a bit about how the team works day to day first." };

  try {
    const draft = await draftHandbook(input);
    return { draft };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong drafting the handbook." };
  }
}

export async function saveHandbookText(_prevState: SaveTextState, formData: FormData): Promise<SaveTextState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;
  const text = (formData.get("text") as string) || "";
  if (!text.trim()) return { error: "The handbook can't be empty." };

  const org = await db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { handbookVersion: true } });
  const nextVersion = (Number(org?.handbookVersion ?? "1.0") + 0.1).toFixed(1);

  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { handbookText: text, handbookVersion: nextVersion },
  });
  await clearReviewedFlag(clientOrgId);
  revalidatePath(PATH);
  return { savedAt: Date.now() };
}

export async function savePrivacyNotice(_prevState: SaveTextState, formData: FormData): Promise<SaveTextState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;
  const text = (formData.get("text") as string) || "";
  if (!text.trim()) return { error: "The privacy notice can't be empty." };

  const org = await db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { privacyNoticeVersion: true } });
  const nextVersion = (Number(org?.privacyNoticeVersion ?? "1.0") + 0.1).toFixed(1);

  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { privacyNoticeText: text, privacyNoticeVersion: nextVersion },
  });
  await clearReviewedFlag(clientOrgId);
  revalidatePath(PATH);
  return { savedAt: Date.now() };
}

export type GenerateQuizState = { error: string } | { count: number } | undefined;

export async function regenerateQuizFromAgreement(): Promise<GenerateQuizState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const org = await db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { employmentAgreementTemplate: true } });
  if (!org?.employmentAgreementTemplate) {
    return { error: "Save your employment agreement first -- the quiz is generated from its actual text." };
  }

  try {
    const questions = await generateComprehensionQuiz(org.employmentAgreementTemplate);
    if (questions.length === 0) {
      return { error: "Couldn't draft questions from that agreement. Try adding more detail to it first." };
    }

    await db.$transaction([
      db.comprehensionQuestion.deleteMany({ where: { clientOrgId } }),
      db.comprehensionQuestion.createMany({
        data: questions.map((q, i) => ({
          clientOrgId,
          question: q.question,
          choices: q.choices,
          correctChoiceIndex: q.correctChoiceIndex,
          explanation: q.explanation,
          order: i,
        })),
      }),
    ]);
    await clearReviewedFlag(clientOrgId);
    revalidatePath(PATH);
    return { count: questions.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong generating the quiz." };
  }
}

const questionSchema = z.object({
  question: z.string().min(1, "Question text is required"),
  choice0: z.string().min(1),
  choice1: z.string().min(1),
  choice2: z.string().min(1),
  choice3: z.string().min(1),
  correctChoiceIndex: z.coerce.number().int().min(0).max(3),
  explanation: z.string().min(1, "Explain why the correct answer is correct"),
});

export async function updateQuizQuestion(questionId: string, formData: FormData) {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid question");

  await db.comprehensionQuestion.updateMany({
    where: { id: questionId, clientOrgId },
    data: {
      question: parsed.data.question,
      choices: [parsed.data.choice0, parsed.data.choice1, parsed.data.choice2, parsed.data.choice3],
      correctChoiceIndex: parsed.data.correctChoiceIndex,
      explanation: parsed.data.explanation,
    },
  });
  await clearReviewedFlag(clientOrgId);
  revalidatePath(PATH);
}

export async function deleteQuizQuestion(questionId: string) {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;
  await db.comprehensionQuestion.deleteMany({ where: { id: questionId, clientOrgId } });
  await clearReviewedFlag(clientOrgId);
  revalidatePath(PATH);
}

export type MarkReviewedState = { error: string } | undefined;

// A missing prerequisite here is an everyday, likely outcome (someone clicks this before
// finishing setup), not a rare edge case -- so this returns state instead of throwing, the
// same fix applied earlier this session to other foreseeable validation failures.
export async function markOnboardingContentReviewed(
  _prevState: MarkReviewedState,
): Promise<MarkReviewedState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const [org, quizCount] = await Promise.all([
    db.clientOrg.findUnique({ where: { id: clientOrgId }, select: { employmentAgreementTemplate: true, handbookText: true } }),
    db.comprehensionQuestion.count({ where: { clientOrgId } }),
  ]);
  if (!org?.employmentAgreementTemplate || !org?.handbookText || quizCount === 0) {
    return { error: "Save the employment agreement, handbook, and comprehension quiz before marking this ready." };
  }

  await db.clientOrg.update({
    where: { id: clientOrgId },
    data: { onboardingContentReviewedAt: new Date(), onboardingContentReviewedById: session.user.id },
  });
  revalidatePath(PATH);
}

// Extra, entirely optional reference material -- a client names it themselves and either
// pastes text or uploads a file. Shown to every new hire alongside the core documents, but
// without the scroll-gated acknowledgment + quiz those get (see acknowledgments-flow.tsx).
export type AddAdditionalDocumentState = { error: string } | undefined;

export async function addAdditionalDocument(
  _prevState: AddAdditionalDocumentState,
  formData: FormData,
): Promise<AddAdditionalDocumentState> {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Give this document a name." };

  const text = (formData.get("text") as string)?.trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!text && !hasFile) return { error: "Paste some text or upload a file." };

  let fileUrl: string | null = null;
  let fileName: string | null = null;
  if (hasFile) {
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      return { error: `That file is too large. Please keep it under ${MAX_DOCUMENT_FILE_LABEL}.` };
    }
    try {
      const blob = await put(`client-onboarding-docs/${clientOrgId}-${Date.now()}-${file.name}`, file, { access: "public" });
      fileUrl = blob.url;
      fileName = file.name;
    } catch (err) {
      console.error("[client-onboarding] failed to upload additional document:", err);
      return { error: "We couldn't upload that file right now. Please try again in a moment." };
    }
  }

  await db.clientOnboardingDocument.create({
    data: { clientOrgId, name, text: text || null, fileUrl, fileName },
  });

  revalidatePath(PATH);
}

export async function deleteAdditionalDocument(documentId: string) {
  const session = await requireRole("CLIENT");
  const clientOrgId = session.user.clientOrgId!;

  const doc = await db.clientOnboardingDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.clientOrgId !== clientOrgId) return;

  await db.clientOnboardingDocument.delete({ where: { id: documentId } });
  revalidatePath(PATH);
}
