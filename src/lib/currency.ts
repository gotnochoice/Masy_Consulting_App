const formatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number | string | { toString(): string } | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  const value = Number(amount.toString());
  if (Number.isNaN(value)) return "-";
  return formatter.format(value);
}
