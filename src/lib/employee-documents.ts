import { put } from "@vercel/blob";
import type { EmployeeDocumentCategory } from "@/generated/prisma/client";

export const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_DOCUMENT_FILE_LABEL = "15MB";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const EMPLOYEE_DOCUMENT_CATEGORY_LABELS: Record<EmployeeDocumentCategory, string> = {
  EMPLOYMENT_LETTER: "Employment letter",
  ONBOARDING: "Onboarding document",
  IDENTIFICATION: "Identification",
  CONTRACT: "Contract",
  OTHER: "Other",
};

export async function uploadEmployeeDocumentFile(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Please upload a PDF, Word document, JPG, PNG, or WEBP file." };
  }
  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    return { error: `That file is too large. Please keep it under ${MAX_DOCUMENT_FILE_LABEL}.` };
  }

  try {
    const blob = await put(`employee-documents/${Date.now()}-${file.name}`, file, { access: "public" });
    return { url: blob.url };
  } catch (err) {
    console.error("[employee-documents] failed to upload:", err);
    return { error: "We couldn't upload that file right now. Please try again in a moment." };
  }
}
