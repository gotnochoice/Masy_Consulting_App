import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { resolveMonth } from "@/lib/attendance";
import { AttendanceSheet } from "@/components/attendance-sheet";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { clearEmployeeAttendance } from "../../actions";

export default async function OpsEmployeeAttendanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("MASY_OPS");
  const { employeeId } = await params;
  const { month } = await searchParams;

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { clientOrg: true },
  });
  if (!employee) notFound();

  const { monthStart, monthEnd, days, monthLabel, prevMonthKey, nextMonthKey } = resolveMonth(month);

  const [records, totalRecordCount] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { employeeId, date: { gte: monthStart, lt: monthEnd } },
    }),
    db.attendanceRecord.count({ where: { employeeId } }),
  ]);
  const recordsByDate = new Map(records.map((r) => [r.date.toISOString().slice(0, 10), r]));
  const clearAttendanceWithId = clearEmployeeAttendance.bind(null, employeeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/ops/attendance" className="text-xs font-medium text-indigo hover:text-indigo-light">
            ← Back to attendance
          </Link>
          <span className="mb-2 mt-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{employee.name}</h1>
          <p className="text-sm text-slate">{employee.roleTitle} · {employee.clientOrg.name}</p>
        </div>
        {totalRecordCount > 0 && (
          <ConfirmSubmitButton
            action={clearAttendanceWithId}
            confirmMessage={`Delete all ${totalRecordCount} attendance record(s) for ${employee.name}, across every month? This can't be undone, and the client will no longer see any attendance history for them.`}
            className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-orange"
          >
            Clear all attendance records
          </ConfirmSubmitButton>
        )}
      </div>

      <AttendanceSheet
        days={days}
        recordsByDate={recordsByDate}
        monthLabel={monthLabel}
        prevHref={`/ops/attendance/employee/${employeeId}?month=${prevMonthKey}`}
        nextHref={`/ops/attendance/employee/${employeeId}?month=${nextMonthKey}`}
      />
    </div>
  );
}
