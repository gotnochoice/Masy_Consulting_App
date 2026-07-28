import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly, formatTime, formatHours, formatDate } from "@/lib/attendance";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { SuccessBanner } from "@/components/success-banner";
import { clockIn, clockOut, deleteAttendanceRecord } from "./actions";

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
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Attendance</h1>
        <p className="text-sm text-slate">Clock in when you start, clock out when you&apos;re done for the day.</p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <SuccessBanner />
        {!todayRecord && (
          <form action={clockIn} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="note">What are you working on today?</label>
              <input id="note" name="note" type="text" required maxLength={280} className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>
              Clock in
            </button>
          </form>
        )}
        {todayRecord && !todayRecord.clockOut && (
          <div className="space-y-3">
            <p className="text-sm text-slate">
              Clocked in at <span className="font-mono text-ink">{formatTime(todayRecord.clockIn)}</span>
              {todayRecord.clockInNote ? ` — "${todayRecord.clockInNote}"` : ""}.
            </p>
            <form action={clockOut} className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="note">What did you get done today?</label>
                <input id="note" name="note" type="text" required maxLength={280} className={inputClass} />
              </div>
              <button type="submit" className={buttonClass}>
                Clock out
              </button>
            </form>
          </div>
        )}
        {todayRecord && todayRecord.clockOut && (
          <div className="space-y-1">
            <p className="text-sm text-slate">
              Done for today,{" "}
              <span className="font-mono text-ink">
                {formatTime(todayRecord.clockIn)} to {formatTime(todayRecord.clockOut)}
              </span>{" "}
              ({formatHours(todayRecord.clockIn, todayRecord.clockOut)}).
            </p>
            {todayRecord.clockOutNote && (
              <p className="text-sm text-ink">&quot;{todayRecord.clockOutNote}&quot;</p>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Date</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Clock in</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Clock out</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Hours</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Notes</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((record) => {
              const deleteWithId = deleteAttendanceRecord.bind(null, record.id);
              return (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-medium text-ink">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate">{formatTime(record.clockIn)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate">{formatTime(record.clockOut)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate">{formatHours(record.clockIn, record.clockOut)}</td>
                  <td className="px-4 py-3 text-slate">
                    {record.clockInNote && <p>In: {record.clockInNote}</p>}
                    {record.clockOutNote && <p>Out: {record.clockOutNote}</p>}
                    {!record.clockInNote && !record.clockOutNote && "–"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmSubmitButton
                      action={deleteWithId}
                      confirmMessage={`Delete the attendance record for ${formatDate(record.date)}? This can't be undone.`}
                      className="text-xs font-medium text-slate-light hover:text-orange"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-light">No attendance records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
