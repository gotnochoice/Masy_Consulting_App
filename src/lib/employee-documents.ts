import type { EmployeeDocumentCategory } from "@/generated/prisma/client";

export const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_DOCUMENT_FILE_LABEL = "15MB";

export const EMPLOYEE_DOCUMENT_CATEGORY_LABELS: Record<EmployeeDocumentCategory, string> = {
  EMPLOYMENT_LETTER: "Employment letter",
  ONBOARDING: "Onboarding document",
  IDENTIFICATION: "Identification",
  CONTRACT: "Contract",
  PROOF_OF_ADDRESS: "Proof of address",
  NIN_SLIP: "NIN slip/card",
  OTHER: "Other",
};

// Identity-verification documents: HR (Masy Ops) and the employee themselves only. A client
// org's Founder/staff never see these, even on their own employee's record -- every
// client-facing document query must exclude these categories.
export const HR_ONLY_DOCUMENT_CATEGORIES: EmployeeDocumentCategory[] = ["IDENTIFICATION", "NIN_SLIP", "PROOF_OF_ADDRESS"];
