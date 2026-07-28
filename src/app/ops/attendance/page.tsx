import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDate, formatTime, formatHours } from "@/lib/attendance";
import { createAttendanceRecord } from "./actions";
import { AttendanceForm } from "./attendance-form";

export default async function OpsAttendancePage() {
  await requireRole("MASY_OPS");

  const [records, employees] = await Promise.all([
    db.attendanceRecord.findMany({
      include: { employee: { include: { clientOrg: true } } },
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.employee.findMany({
      include: { clientOrg: true },
      orderBy: [{ clientOrg: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Attendance</h1>
        <p className="text-sm text-slate">Rollup across all client organizations. Most recent 100 records.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Employee</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock in</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock out</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Hours</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Notes</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => {
              const notes = [record.clockInNote, record.clockOutNote].filter(Boolean).join(" / ");
              return (
                <tr key={record.id} className="hover:bg-paper-2">
                  <td className="px-4 py-3 text-xs text-slate">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{record.employee.name}</td>
                  <td className="px-4 py-3 text-slate">{record.employee.clientOrg.name}</td>
                  <td className="px-4 py-3 text-xs text-slate">{formatTime(record.clockIn)}</td>
                  <td className="px-4 py-3 text-xs text-slate">{formatTime(record.clockOut)}</td>
                  <td className="px-4 py-3 text-xs text-slate">{formatHours(record.clockIn, record.clockOut)}</td>
                  <td className="px-4 py-3 max-w-[16rem] truncate text-slate" title={notes || undefined}>
                    {notes || "–"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/ops/attendance/${record.id}/edit`} className="text-sm font-medium text-indigo hover:text-indigo-light">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-light">No attendance records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">Add or correct a record</h2>
        <p className="mb-4 text-xs text-slate">
          Use this when an employee forgot to clock in/out, or a day is missing entirely. To fix an existing day, use
          the Edit link on that row instead.
        </p>
        <AttendanceForm employees={employees} action={createAttendanceRecord} submitLabel="Save record" />
      </div>
    </div>
  );
}
