export function leaveDaysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
