import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { resolveMonth } from "@/lib/attendance";
import { AttendanceSheet } from "@/components/attendance-sheet";

export default async function ClientEmployeeAttendanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireRole("CLIENT");
  const { employeeId } = await params;
  const { month } = await searchParams;

  const employee = await db.employee.findFirst({
    where: { id: employeeId, ...scopedEmployeeWhere(session) },
  });
  if (!employee) notFound();

  const { monthStart, monthEnd, days, monthLabel, prevMonthKey, nextMonthKey } = resolveMonth(month);

  const records = await db.attendanceRecord.findMany({
    where: { employeeId, date: { gte: monthStart, lt: monthEnd } },
  });
  const recordsByDate = new Map(records.map((r) => [r.date.toISOString().slice(0, 10), r]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/client/attendance" className="text-xs font-medium text-indigo hover:text-indigo-light">
          ← Back to attendance
        </Link>
        <span className="mb-2 mt-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">{employee.name}</h1>
        <p className="text-sm text-slate">{employee.roleTitle}</p>
      </div>

      <AttendanceSheet
        days={days}
        recordsByDate={recordsByDate}
        monthLabel={monthLabel}
        prevHref={`/client/attendance/employee/${employeeId}?month=${prevMonthKey}`}
        nextHref={`/client/attendance/employee/${employeeId}?month=${nextMonthKey}`}
      />
    </div>
  );
}
