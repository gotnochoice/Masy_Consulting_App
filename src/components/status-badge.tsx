import type { EmployeeStatus } from "@/generated/prisma/client";

const STYLES: Record<EmployeeStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 ring-green-600/20",
  ON_LEAVE: "bg-amber-50 text-amber-700 ring-amber-600/20",
  OFFBOARDED: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
};

const LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  OFFBOARDED: "Offboarded",
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
