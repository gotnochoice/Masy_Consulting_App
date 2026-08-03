import { db } from "@/lib/db";

export type OpsInboxItem = { label: string; count: number; href: string };

export async function getOpsInboxItems(): Promise<OpsInboxItem[]> {
  const [concerns, leave, documents, reviews] = await Promise.all([
    db.concern.count({ where: { visibility: "RAW" } }),
    db.leaveRequest.count({ where: { status: "PENDING" } }),
    db.documentRequest.count({ where: { status: "REQUESTED" } }),
    db.performanceReview.count({ where: { status: "SUBMITTED" } }),
  ]);

  return [
    { label: "New concerns to review", count: concerns, href: "/ops/concerns" },
    { label: "Leave requests awaiting a decision", count: leave, href: "/ops/leave" },
    { label: "Document requests to fulfill", count: documents, href: "/ops/documents" },
    { label: "Performance reviews to release", count: reviews, href: "/ops/reviews" },
  ];
}
