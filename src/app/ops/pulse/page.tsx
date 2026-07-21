import { Smile, Activity } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { PULSE_SCORE_LABELS } from "@/lib/pulse";
import { StatCard } from "@/components/stat-card";

export default async function OpsPulsePage() {
  await requireRole("MASY_OPS");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [checkIns, thisMonth] = await Promise.all([
    db.pulseCheckIn.findMany({
      include: { employee: { include: { clientOrg: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.pulseCheckIn.findMany({ where: { createdAt: { gte: monthStart } } }),
  ]);

  const avgThisMonth =
    thisMonth.length > 0 ? (thisMonth.reduce((sum, c) => sum + c.score, 0) / thisMonth.length).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Pulse</h1>
        <p className="text-sm text-slate">How employees say they&apos;re doing, across every client organization.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Average score this month" value={avgThisMonth} icon={Smile} />
        <StatCard label="Check-ins this month" value={thisMonth.length} icon={Activity} />
      </div>

      <div className="space-y-3">
        {checkIns.map((c) => (
          <div key={c.id} className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                {c.employee.name} <span className="font-normal text-slate">· {c.employee.clientOrg.name}</span>
              </p>
              <p className="font-mono text-xs text-slate-light">{formatDateShort(c.createdAt)}</p>
            </div>
            <p className="mt-1 text-sm text-slate">
              {c.score}/5 — {PULSE_SCORE_LABELS[c.score]}
              {c.comment ? ` — ${c.comment}` : ""}
            </p>
          </div>
        ))}
        {checkIns.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] px-5 py-6 text-center text-sm text-slate">
            No check-ins yet.
          </p>
        )}
      </div>
    </div>
  );
}
