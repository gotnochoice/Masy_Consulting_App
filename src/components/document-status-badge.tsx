import type { DocumentRequestStatus } from "@/generated/prisma/client";

const STYLES: Record<DocumentRequestStatus, string> = {
  REQUESTED: "bg-orange-light/40 text-orange",
  IN_PROGRESS: "bg-indigo-tint text-indigo",
  FULFILLED: "bg-indigo-tint text-indigo",
  DECLINED: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<DocumentRequestStatus, string> = {
  REQUESTED: "Requested",
  IN_PROGRESS: "In progress",
  FULFILLED: "Fulfilled",
  DECLINED: "Declined",
};

export function DocumentStatusBadge({ status }: { status: DocumentRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
