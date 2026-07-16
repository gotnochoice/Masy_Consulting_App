import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "indigo" | "orange";
}) {
  const iconClasses = tone === "orange" ? "bg-orange-light/40 text-orange" : "bg-indigo-tint text-indigo";

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-paper shadow-sm p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-sm text-slate">{label}</p>
        <p className="text-2xl font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
