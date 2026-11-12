import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly, formatTime, formatWorkedHours, formatDate } from "@/lib/attendance";
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
    db.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      include: { sessions: { orderBy: { clockIn: "asc" } } },
    }),
    db.attendanceRecord.findMany({
      where: { employeeId, date: { gte: thirtyDaysAgo } },
      include: { sessions: { orderBy: { clockIn: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const openSession = todayRecord?.sessions.find((s) => !s.clockOut) ?? null;
  const hasSteppedOutToday = !!todayRecord && !openSession;

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Attendance</h1>
        <p className="text-sm text-slate">
          Clock in when you start. If you need to step away from your desk, clock out with a quick reason, then
          clock back in when you&apos;re back -- you can do this as many times as you need in a day.
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <SuccessBanner />

        {todayRecord && todayRecord.sessions.length > 0 && (
          <div className="mb-5 space-y-1.5 border-b border-border pb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">Today so far</p>
            {todayRecord.sessions.map((s) => (
              <p key={s.id} className="text-sm text-slate">
                <span className="text-ink">
                  {formatTime(s.clockIn)} – {s.clockOut ? formatTime(s.clockOut) : "now"}
                </span>
                {s.clockInNote && !s.clockOut ? ` ("${s.clockInNote}")` : ""}
                {s.clockOutNote ? ` -- ${s.clockOutNote}` : ""}
              </p>
            ))}
          </div>
        )}

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

        {openSession && (
          <div className="space-y-3">
            <p className="text-sm text-slate">
              Currently clocked in, since <span className="text-ink">{formatTime(openSession.clockIn)}</span>.
            </p>
            <form action={clockOut} className="space-y-3">
              <div>
                <label className={labelClass} htmlFor="note">
                  Why are you clocking out? (stepping away, or done for the day)
                </label>
                <input id="note" name="note" type="text" required maxLength={280} className={inputClass} />
              </div>
              <button type="submit" className={buttonClass}>
                Clock out
              </button>
            </form>
          </div>
        )}

        {hasSteppedOutToday && (
          <form action={clockIn} className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="note">Back at your desk? What are you working on now?</label>
              <input id="note" name="note" type="text" required maxLength={280} className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>
              Clock back in
            </button>
          </form>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock in</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock out</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Hours</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Notes</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((record) => {
              const deleteWithId = deleteAttendanceRecord.bind(null, record.id);
              return (
                <tr key={record.id}>
                  <td className="px-3 py-2.5 font-medium text-ink">{formatDate(record.date)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate">{formatTime(record.clockIn)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate">{formatTime(record.clockOut)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate">{formatWorkedHours(record.sessions)}</td>
                  <td className="px-3 py-2.5 text-slate">
                    {record.sessions.length > 0 ? (
                      record.sessions.map((s) => (
                        <div key={s.id}>
                          {s.clockInNote && <p>In: {s.clockInNote}</p>}
                          {s.clockOutNote && <p>Out: {s.clockOutNote}</p>}
                        </div>
                      ))
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
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
