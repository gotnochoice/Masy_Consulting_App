export type NigeriaHoliday = { date: string; name: string; moonSighting?: boolean };

// Federal public holidays per the Public Holidays Act. Islamic holidays (Eid al-Fitr,
// Eid al-Adha, Eid el-Maulud) depend on moon sighting and are only officially confirmed
// by the Federal Government 1-2 days ahead, so their dates here are the widely expected
// ones and can shift by a day.
export const NIGERIA_PUBLIC_HOLIDAYS_2026: NigeriaHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-03-20", name: "Eid al-Fitr", moonSighting: true },
  { date: "2026-03-21", name: "Eid al-Fitr (day 2)", moonSighting: true },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-05-01", name: "Workers' Day" },
  { date: "2026-05-27", name: "Eid al-Adha", moonSighting: true },
  { date: "2026-05-28", name: "Eid al-Adha (day 2)", moonSighting: true },
  { date: "2026-06-12", name: "Democracy Day" },
  { date: "2026-08-25", name: "Eid el-Maulud", moonSighting: true },
  { date: "2026-10-01", name: "National Independence Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
];

export function getUpcomingNigeriaHolidays(limit = 5): NigeriaHoliday[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  return NIGERIA_PUBLIC_HOLIDAYS_2026.filter((h) => h.date >= todayStr).slice(0, limit);
}
