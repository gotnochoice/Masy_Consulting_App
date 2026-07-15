import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly, formatTime, formatHours, formatDate } from "@/lib/attendance";
import { clockIn, clockOut } from "./actions";

export default async function MyAttendancePage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-neutral-500">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const today = todayDateOnly();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [todayRecord, history] = await Promise.all([
    db.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date: today } } }),
    db.attendanceRecord.findMany({
      where: { employeeId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Attendance</h1>
        <p className="text-sm text-neutral-500">Clock in when you start, clock out when you&apos;re done for the day.</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {!todayRecord && (
          <form action={clockIn}>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Clock in
            </button>
          </form>
        )}
        {todayRecord && !todayRecord.clockOut && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Clocked in at {formatTime(todayRecord.clockIn)}.</p>
            <form action={clockOut}>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Clock out
              </button>
            </form>
          </div>
        )}
        {todayRecord && todayRecord.clockOut && (
          <p className="text-sm text-neutral-600">
            Done for today — {formatTime(todayRecord.clockIn)} to {formatTime(todayRecord.clockOut)} (
            {formatHours(todayRecord.clockIn, todayRecord.clockOut)}).
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Date</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Clock in</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Clock out</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {history.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-2 text-neutral-900">{formatDate(record.date)}</td>
                <td className="px-4 py-2 text-neutral-600">{formatTime(record.clockIn)}</td>
                <td className="px-4 py-2 text-neutral-600">{formatTime(record.clockOut)}</td>
                <td className="px-4 py-2 text-neutral-600">{formatHours(record.clockIn, record.clockOut)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">No attendance records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
