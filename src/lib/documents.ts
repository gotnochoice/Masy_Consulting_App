import type { DocumentRequestType } from "@/generated/prisma/client";

export const DOCUMENT_TYPE_LABELS: Record<DocumentRequestType, string> = {
  EMPLOYMENT_VERIFICATION: "Employment verification letter",
  REFERENCE: "Reference / recommendation letter",
  SALARY_CONFIRMATION: "Salary confirmation letter",
  OTHER: "Other request",
};
