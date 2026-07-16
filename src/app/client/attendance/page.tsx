import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";

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

  const records = await db.attendanceRecord.findMany({
    where: {
      employee: scopedEmployeeWhere(session),
      date: { gte: monthStart, lt: monthEnd },
    },
    include: { employee: true },
    orderBy: { date: "asc" },
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
        <h1 className="text-2xl font-bold text-ink">Attendance — {monthLabel}</h1>
        <p className="text-sm text-slate">Read-only monthly summary for your team.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper shadow-sm">
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
                    <span className="rounded-full bg-orange-light/40 px-2.5 py-0.5 font-mono text-xs font-medium text-orange">
                      {row.incompleteDays}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate">
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
