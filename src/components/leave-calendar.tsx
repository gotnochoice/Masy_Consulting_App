type DayEntry = { employeeName: string; type: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function initialsFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function LeaveCalendar({
  monthStart,
  leaveByDay,
}: {
  monthStart: Date;
  leaveByDay: Map<number, DayEntry[]>;
}) {
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = monthStart.getUTCDay();

  const today = new Date();
  const isCurrentMonth = today.getUTCFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-light">
            {wd}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const entries = leaveByDay.get(day) ?? [];
          const isToday = isCurrentMonth && day === todayDate;
          return (
            <div
              key={day}
              className={`min-h-16 rounded-btn border p-1.5 ${
                isToday ? "border-indigo bg-indigo-tint" : "border-border bg-paper"
              }`}
            >
              <p className={`mb-1 text-right text-[10px] ${isToday ? "font-semibold text-indigo" : "text-slate-light"}`}>
                {day}
              </p>
              {entries.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {entries.slice(0, 3).map((e, idx) => (
                    <div
                      key={idx}
                      title={`${e.employeeName} · ${e.type.toLowerCase()}`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-light/60 text-[9px] font-semibold text-orange"
                    >
                      {initialsFor(e.employeeName)}
                    </div>
                  ))}
                  {entries.length > 3 && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[9px] font-medium text-slate-light">
                      +{entries.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-light">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-light/60" />
        Each circle is a team member on approved leave that day.
      </p>
    </div>
  );
}
