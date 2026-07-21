import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly, formatTime, formatHours, formatDate } from "@/lib/attendance";
import { buttonClass } from "@/lib/form-styles";
import { clockIn, clockOut } from "./actions";

export default async function MyAttendancePage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
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
        <h1 className="text-3xl font-extrabold text-ink">Attendance</h1>
        <p className="text-sm text-slate">Clock in when you start, clock out when you&apos;re done for the day.</p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-6">
        {!todayRecord && (
          <form action={clockIn}>
            <button type="submit" className={buttonClass}>
              Clock in
            </button>
          </form>
        )}
        {todayRecord && !todayRecord.clockOut && (
          <div className="space-y-3">
            <p className="text-sm text-slate">
              Clocked in at <span className="font-mono text-ink">{formatTime(todayRecord.clockIn)}</span>.
            </p>
            <form action={clockOut}>
              <button type="submit" className={buttonClass}>
                Clock out
              </button>
            </form>
          </div>
        )}
        {todayRecord && todayRecord.clockOut && (
          <p className="text-sm text-slate">
            Done for today —{" "}
            <span className="font-mono text-ink">
              {formatTime(todayRecord.clockIn)} to {formatTime(todayRecord.clockOut)}
            </span>{" "}
            ({formatHours(todayRecord.clockIn, todayRecord.clockOut)}).
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)]">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Date</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Clock in</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Clock out</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3 font-medium text-ink">{formatDate(record.date)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatTime(record.clockIn)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatTime(record.clockOut)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{formatHours(record.clockIn, record.clockOut)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate">No attendance records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
