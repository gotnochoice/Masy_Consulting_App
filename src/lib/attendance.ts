export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function formatHours(clockIn: Date, clockOut: Date | null): string {
  if (!clockOut) return "—";
  const hours = (clockOut.getTime() - clockIn.getTime()) / 3_600_000;
  return `${hours.toFixed(1)}h`;
}

export function formatTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}
