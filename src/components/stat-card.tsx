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
  const iconClasses = tone === "orange" ? "bg-orange-light/40 text-orange" : "bg-indigo-tint text-indigo";
  const iconSize = size === "large" ? "h-14 w-14" : "h-11 w-11";
  const iconGlyph = size === "large" ? "h-7 w-7" : "h-5 w-5";
  const valueSize = size === "large" ? "text-4xl" : "text-2xl";

  return (
    <div className="overflow-hidden rounded-card border border-border bg-paper shadow-sm">
      <div className="h-1 bg-gradient-to-r from-orange to-indigo" />
      <div className="flex items-center gap-4 p-5">
        <div className={`flex ${iconSize} shrink-0 items-center justify-center rounded-xl ${iconClasses}`}>
          <Icon className={iconGlyph} strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm text-slate">{label}</p>
          <p className={`${valueSize} font-bold text-ink`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
