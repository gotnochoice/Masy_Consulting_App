export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function formatHours(clockIn: Date, clockOut: Date | null): string {
  if (!clockOut) return "–";
  const hours = (clockOut.getTime() - clockIn.getTime()) / 3_600_000;
  return `${hours.toFixed(1)}h`;
}

export function formatTime(date: Date | null): string {
  if (!date) return "–";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function resolveMonth(monthParam: string | undefined) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1; // 1-12

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month - 1, i + 1)));
  const monthLabel = monthStart.toLocaleDateString([], { year: "numeric", month: "long", timeZone: "UTC" });

  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  const nextDate = new Date(Date.UTC(year, month, 1));
  const key = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  return {
    monthStart,
    monthEnd,
    days,
    monthLabel,
    prevMonthKey: key(prevDate),
    nextMonthKey: key(nextDate),
  };
}
