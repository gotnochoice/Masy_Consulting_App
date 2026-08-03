import { db } from "@/lib/db";

export async function getUnreadAnnouncements(userId: string, clientOrgId: string | null) {
  return db.announcement.findMany({
    where: {
      OR: [{ clientOrgId: null }, { clientOrgId: clientOrgId ?? "__none__" }],
      NOT: { acks: { some: { userId } } },
    },
    orderBy: { createdAt: "desc" },
  });
}
