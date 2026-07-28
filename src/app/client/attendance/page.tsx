import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AttendanceTrendChart } from "@/components/attendance-trend-chart";

type EmployeeSummary = {
  employeeId: string;
  name: string;
  daysPresent: number;
  incompleteDays: number;
  totalHoursMs: number;
};

export default async function ClientAttendancePage() {
  const session = await requireRole("CLIENT");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

  const months = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 1));
    return { label: start.toLocaleDateString([], { month: "short", year: "numeric" }), start, end };
  });

  const [records, sixMonthRecords] = await Promise.all([
    db.attendanceRecord.findMany({
      where: {
        employee: scopedEmployeeWhere(session),
        date: { gte: monthStart, lt: monthEnd },
      },
      include: { employee: true },
      orderBy: { date: "asc" },
    }),
    db.attendanceRecord.findMany({
      where: {
        employee: scopedEmployeeWhere(session),
        date: { gte: months[0].start },
        clockOut: { not: null },
      },
    }),
  ]);

  const trendRows = months.map((m) => {
    const inRange = sixMonthRecords.filter((r) => r.date >= m.start && r.date < m.end);
    const totalMs = inRange.reduce((sum, r) => sum + (r.clockOut!.getTime() - r.clockIn.getTime()), 0);
    return { label: m.label, hours: Math.round(totalMs / 3_600_000) };
  });

  const byEmployee = new Map<string, EmployeeSummary>();

  for (const record of records) {
    const entry = byEmployee.get(record.employeeId) ?? {
      employeeId: record.employeeId,
      name: record.employee.name,
      daysPresent: 0,
      incompleteDays: 0,
      totalHoursMs: 0,
    };
    entry.daysPresent += 1;
    if (record.clockOut) {
      entry.totalHoursMs += record.clockOut.getTime() - record.clockIn.getTime();
    } else {
      entry.incompleteDays += 1;
    }
    byEmployee.set(record.employeeId, entry);
  }

  const rows = Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name));
  const monthLabel = now.toLocaleDateString([], { year: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Attendance for {monthLabel}</h1>
        <p className="text-sm text-slate">Read-only monthly summary for your team.</p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-slate-light">
          6-month trend, total hours logged
        </p>
        <AttendanceTrendChart rows={trendRows} />
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-indigo-tint">
            <tr>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Name</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Days present</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Total hours</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Incomplete days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.employeeId}>
                <td className="px-5 py-3 font-medium text-ink">{row.name}</td>
                <td className="px-5 py-3 text-slate">{row.daysPresent}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate">{(row.totalHoursMs / 3_600_000).toFixed(1)}h</td>
                <td className="px-5 py-3 text-slate">
                  {row.incompleteDays > 0 ? (
                    <span className="rounded-btn bg-orange-light/40 px-2.5 py-0.5 font-mono text-xs font-medium text-orange">
                      {row.incompleteDays}
                    </span>
                  ) : (
                    "–"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-light">
                  No attendance recorded yet this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
