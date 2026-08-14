import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDate, formatTime, formatHours } from "@/lib/attendance";
import { createAttendanceRecord } from "./actions";
import { AttendanceForm } from "./attendance-form";
import { EmployeeAvatar } from "@/components/employee-avatar";

export default async function OpsAttendancePage() {
  await requireRole("MASY_OPS");

  const [orgs, recentRecords] = await Promise.all([
    db.clientOrg.findMany({
      orderBy: { name: "asc" },
      include: {
        employees: {
          where: { status: { not: "OFFBOARDED" } },
          orderBy: { name: "asc" },
        },
      },
    }),
    db.attendanceRecord.findMany({
      include: { employee: { include: { clientOrg: true } } },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  const employees = orgs.flatMap((o) => o.employees.map((e) => ({ ...e, clientOrg: { name: o.name } })));

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Attendance</h1>
        <p className="text-sm text-slate">Every client&rsquo;s staff, by company. Open a name for their full monthly sheet.</p>
      </div>

      <div className="space-y-6">
        {orgs.map((org) => {
          if (org.employees.length === 0) return null;
          return (
            <div key={org.id} className="rounded-card border border-border bg-paper">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">{org.name}</h2>
                <p className="text-xs text-slate-light">{org.employees.length} staff</p>
              </div>
              <div className="divide-y divide-border">
                {org.employees.map((employee) => (
                  <Link
                    key={employee.id}
                    href={`/ops/attendance/employee/${employee.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper-2"
                  >
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} />
                      <div>
                        <p className="text-sm font-medium text-ink">{employee.name}</p>
                        <p className="text-xs text-slate-light">{employee.roleTitle}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-indigo">View sheet →</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {employees.length === 0 && (
          <p className="rounded-card border border-dashed border-border px-5 py-8 text-center text-sm text-slate-light">
            No staff on record yet.
          </p>
        )}
      </div>

      <details className="rounded-card border border-border bg-paper">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          Recent activity across all companies
        </summary>
        <div className="overflow-x-auto border-t border-border">
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
              {recentRecords.map((record) => {
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
              {recentRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-light">No attendance records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">Add or correct a record</h2>
        <p className="mb-4 text-xs text-slate">
          Use this when an employee forgot to clock in/out, or a day is missing entirely. To fix an existing day, use
          the Edit link on that row in Recent activity instead.
        </p>
        <AttendanceForm employees={employees} action={createAttendanceRecord} submitLabel="Save record" />
      </div>
    </div>
  );
}
