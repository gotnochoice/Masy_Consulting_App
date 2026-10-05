import type { EmployeeStatus } from "@/generated/prisma/client";

const STYLES: Record<EmployeeStatus, string> = {
  PENDING: "bg-paper-2 text-slate border border-dashed border-slate-light",
  ACTIVE: "bg-indigo-tint text-indigo",
  ON_LEAVE: "bg-orange-light/40 text-orange",
  OFFBOARDED: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<EmployeeStatus, string> = {
  PENDING: "Pending onboarding",
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  OFFBOARDED: "Offboarded",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
