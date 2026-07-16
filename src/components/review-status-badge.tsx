import type { ReviewStatus } from "@/generated/prisma/client";

const STYLES: Record<ReviewStatus, string> = {
  SUBMITTED: "bg-orange-light/40 text-orange",
  MASY_REVIEWED: "bg-indigo-tint text-indigo",
  RELEASED: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<ReviewStatus, string> = {
  SUBMITTED: "Awaiting review",
  MASY_REVIEWED: "Reviewed",
  RELEASED: "Released to client",
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
