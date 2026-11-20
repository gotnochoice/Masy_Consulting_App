import { db } from "@/lib/db";

export async function getNewApplicantsCount(clientOrgId?: string) {
  return db.candidate.count({
    where: {
      source: { in: ["WEBSITE", "GOOGLE_FORM"] },
      stage: "APPLIED",
      ...(clientOrgId ? { openRole: { clientOrgId } } : {}),
    },
  });
}
