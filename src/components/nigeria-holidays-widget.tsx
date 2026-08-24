import { CalendarDays } from "lucide-react";
import { getUpcomingNigeriaHolidays } from "@/lib/nigeria-holidays";

function relativeDayLabel(dateStr: string): string | null {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";
  return null;
}

export function NigeriaHolidaysWidget() {
  const holidays = getUpcomingNigeriaHolidays();
  if (holidays.length === 0) return null;

  return (
    <div className="rounded-card border border-border bg-paper p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-orange" strokeWidth={2} />
        <p className="text-sm font-semibold text-ink">Upcoming Nigeria public holidays</p>
      </div>
      <div className="space-y-2">
        {holidays.map((h) => {
          const relative = relativeDayLabel(h.date);
          const formatted = new Date(`${h.date}T00:00:00`).toLocaleDateString("en-NG", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          return (
            <div key={h.date + h.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">
                {h.name}
                {h.moonSighting && (
                  <span className="ml-1.5 text-xs text-slate-light">(pending moon sighting)</span>
                )}
              </span>
              <span className={`shrink-0 text-xs font-medium ${relative ? "text-orange" : "text-slate-light"}`}>
                {relative ?? formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
