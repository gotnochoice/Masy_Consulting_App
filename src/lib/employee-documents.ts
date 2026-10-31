import type { EmployeeDocumentCategory } from "@/generated/prisma/client";

export const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_DOCUMENT_FILE_LABEL = "15MB";

export const EMPLOYEE_DOCUMENT_CATEGORY_LABELS: Record<EmployeeDocumentCategory, string> = {
  EMPLOYMENT_LETTER: "Employment letter",
  ONBOARDING: "Onboarding document",
  IDENTIFICATION: "Identification",
  CONTRACT: "Contract",
  OTHER: "Other",
};
