import type { EmployeeStatus } from "@/generated/prisma/client";

const STYLES: Record<EmployeeStatus, string> = {
  ACTIVE: "bg-indigo-tint text-indigo",
  ON_LEAVE: "bg-orange-light/40 text-orange",
  OFFBOARDED: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  OFFBOARDED: "Offboarded",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
