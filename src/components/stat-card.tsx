import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "indigo",
  size = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "indigo" | "orange";
  size?: "default" | "large";
}) {
  const accentClasses = tone === "orange" ? "bg-orange" : "bg-indigo";
  const iconClasses = tone === "orange" ? "bg-orange-light/40 text-orange" : "bg-indigo-tint text-indigo";
  const iconSize = size === "large" ? "h-14 w-14" : "h-11 w-11";
  const iconGlyph = size === "large" ? "h-7 w-7" : "h-5 w-5";
  const valueSize = size === "large" ? "text-4xl" : "text-2xl";

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-paper">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClasses}`} />
      <div className="flex items-center gap-4 p-5 pt-6">
        <div className={`flex ${iconSize} shrink-0 items-center justify-center rounded-lg ${iconClasses}`}>
          <Icon className={iconGlyph} strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm text-slate">{label}</p>
          <p className={`${valueSize} font-bold tracking-tight text-ink`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
