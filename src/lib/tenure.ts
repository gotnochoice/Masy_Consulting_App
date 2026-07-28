export function formatTenure(startDate: Date): string {
  const now = new Date();
  const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  if (months < 1) return "Just started";
  if (months < 12) return `${months} mo${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0 ? `${years} yr${years === 1 ? "" : "s"}` : `${years}y ${remainder}m`;
}
