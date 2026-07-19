import type { LeaveStatus } from "@/generated/prisma/client";

const STYLES: Record<LeaveStatus, string> = {
  PENDING: "bg-orange-light/40 text-orange",
  APPROVED: "bg-indigo-tint text-indigo",
  DENIED: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DENIED: "Denied",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 font-mono text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
