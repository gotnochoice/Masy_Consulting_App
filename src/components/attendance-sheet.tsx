import Link from "next/link";
import { formatTime, formatHours } from "@/lib/attendance";

type Record = {
  clockIn: Date;
  clockOut: Date | null;
  clockInNote: string | null;
  clockOutNote: string | null;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function notesFor(record: Record) {
  const parts: string[] = [];
  if (record.clockInNote) parts.push(`In: ${record.clockInNote}`);
  if (record.clockOutNote) parts.push(`Out: ${record.clockOutNote}`);
  return parts;
}

export function AttendanceSheet({
  days,
  recordsByDate,
  monthLabel,
  prevHref,
  nextHref,
}: {
  days: Date[];
  recordsByDate: Map<string, Record>;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
}) {
  const records = Array.from(recordsByDate.values());
  const daysPresent = records.length;
  const totalHoursMs = records.reduce(
    (sum, r) => (r.clockOut ? sum + (r.clockOut.getTime() - r.clockIn.getTime()) : sum),
    0,
  );
  const totalHours = (totalHoursMs / 3_600_000).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-paper px-4 py-3">
        <Link href={prevHref} className="text-sm font-medium text-indigo hover:text-indigo-light">
          ← Prev
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">{monthLabel}</p>
          <p className="text-xs text-slate-light">
            {daysPresent} day{daysPresent === 1 ? "" : "s"} present · {totalHours}h total
          </p>
        </div>
        <Link href={nextHref} className="text-sm font-medium text-indigo hover:text-indigo-light">
          Next →
        </Link>
      </div>

      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-paper sm:block">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock in</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Clock out</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Hours</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">What was done</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {days.map((day) => {
              const key = dateKey(day);
              const record = recordsByDate.get(key);
              const weekday = day.getUTCDay();
              const isWeekend = weekday === 0 || weekday === 6;
              const notes = record ? notesFor(record) : [];
              return (
                <tr key={key} className={isWeekend ? "bg-paper-2/50" : ""}>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {WEEKDAY_LABELS[weekday]} {day.getUTCDate()}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate">{record ? formatTime(record.clockIn) : "–"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate">{record ? formatTime(record.clockOut) : "–"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate">
                    {record ? formatHours(record.clockIn, record.clockOut) : "–"}
                  </td>
                  <td className="px-4 py-2.5 text-slate">
                    {notes.length > 0 ? (
                      <ul className="space-y-0.5">
                        {notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-2 sm:hidden">
        {days.map((day) => {
          const key = dateKey(day);
          const record = recordsByDate.get(key);
          const weekday = day.getUTCDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const notes = record ? notesFor(record) : [];
          return (
            <div
              key={key}
              className={`rounded-card border border-border p-3 ${isWeekend ? "bg-paper-2/50" : "bg-paper"}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">
                  {WEEKDAY_LABELS[weekday]} {day.getUTCDate()}
                </p>
                {record ? (
                  <p className="text-xs text-slate">
                    {formatTime(record.clockIn)} – {formatTime(record.clockOut)} · {formatHours(record.clockIn, record.clockOut)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-light">No record</p>
                )}
              </div>
              {notes.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-slate">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
