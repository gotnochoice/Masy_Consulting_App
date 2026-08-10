import { db } from "@/lib/db";

export async function getNewApplicantsCount(clientOrgId?: string) {
  return db.candidate.count({
    where: {
      source: "WEBSITE",
      stage: "APPLIED",
      ...(clientOrgId ? { openRole: { clientOrgId } } : {}),
    },
  });
}
