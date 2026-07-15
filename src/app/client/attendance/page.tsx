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
        <h1 className="text-lg font-semibold text-neutral-900">Attendance — {monthLabel}</h1>
        <p className="text-sm text-neutral-500">Read-only monthly summary for your team.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Days present</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Total hours</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Incomplete days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.employeeId}>
                <td className="px-4 py-2 text-neutral-900">{row.name}</td>
                <td className="px-4 py-2 text-neutral-600">{row.daysPresent}</td>
                <td className="px-4 py-2 text-neutral-600">{(row.totalHoursMs / 3_600_000).toFixed(1)}h</td>
                <td className="px-4 py-2 text-neutral-600">{row.incompleteDays > 0 ? row.incompleteDays : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
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
