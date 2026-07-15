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
        <h1 className="text-lg font-semibold text-neutral-900">Attendance</h1>
        <p className="text-sm text-neutral-500">Rollup across all client organizations. Most recent 100 records.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Date</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Employee</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Organization</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Clock in</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Clock out</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Hours</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-2 text-neutral-900">{formatDate(record.date)}</td>
                <td className="px-4 py-2 text-neutral-600">{record.employee.name}</td>
                <td className="px-4 py-2 text-neutral-600">{record.employee.clientOrg.name}</td>
                <td className="px-4 py-2 text-neutral-600">{formatTime(record.clockIn)}</td>
                <td className="px-4 py-2 text-neutral-600">{formatTime(record.clockOut)}</td>
                <td className="px-4 py-2 text-neutral-600">{formatHours(record.clockIn, record.clockOut)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/ops/attendance/${record.id}/edit`} className="text-neutral-500 hover:text-neutral-900">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">No attendance records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">Add or correct a record</h2>
        <p className="mb-4 text-xs text-neutral-500">
          Use this when an employee forgot to clock in/out, or a day is missing entirely. To fix an existing day, use
          the Edit link on that row instead.
        </p>
        <AttendanceForm employees={employees} action={createAttendanceRecord} submitLabel="Save record" />
      </div>
    </div>
  );
}
