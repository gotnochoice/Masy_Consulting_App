import { db } from "@/lib/db";
import { scopedEmployeeWhere } from "@/lib/rbac";
import type { Session } from "next-auth";

export async function getUnresolvedReviewsForClient(session: Session) {
  return db.performanceReview.findMany({
    where: {
      employee: scopedEmployeeWhere(session),
      status: "RELEASED",
      NOT: { acks: { some: { userId: session.user.id } } },
    },
    include: { employee: true },
    orderBy: { updatedAt: "desc" },
  });
}
