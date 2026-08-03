import { db } from "@/lib/db";
import { scopedEmployeeWhere } from "@/lib/rbac";
import type { Session } from "next-auth";

export async function getUnresolvedConcernsForClient(session: Session) {
  return db.concern.findMany({
    where: {
      employee: scopedEmployeeWhere(session),
      visibility: "CLIENT_VISIBLE",
      NOT: { acks: { some: { userId: session.user.id } } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
