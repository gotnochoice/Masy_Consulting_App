import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PULSE_MIN_SAMPLE_SIZE } from "@/lib/pulse";
import { PulseTrendChart } from "@/components/pulse-trend-chart";

export default async function ClientPulsePage() {
  const session = await requireRole("CLIENT");

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 1));
    return { label: start.toLocaleDateString([], { month: "short", year: "numeric" }), start, end };
  });

  const checkIns = await db.pulseCheckIn.findMany({
    where: { employee: scopedEmployeeWhere(session), createdAt: { gte: months[0].start } },
  });

  const rows = months.map((m) => {
    const inRange = checkIns.filter((c) => c.createdAt >= m.start && c.createdAt < m.end);
    const enough = inRange.length >= PULSE_MIN_SAMPLE_SIZE;
    const avg = enough ? (inRange.reduce((sum, c) => sum + c.score, 0) / inRange.length).toFixed(1) : null;
    return { label: m.label, avg, count: inRange.length, enough };
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Team pulse</h1>
        <p className="text-sm text-slate">
          A monthly average from short private check-ins with your team. Individual answers stay with Masy, this
          is trend only, and only shown once enough people have responded that no one answer stands out.
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-slate-light">
          6-month trend
        </p>
        <PulseTrendChart rows={rows} />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-light">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-light bg-paper" />
          Hollow points mean not enough check-ins that month to show a trend.
        </p>
      </div>

      <details className="group rounded-card border border-border bg-paper">
        <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate hover:text-ink">
          View as table
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-indigo-tint">
              <tr>
                <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Month</th>
                <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Average score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-5 py-3 font-medium text-ink">{r.label}</td>
                  <td className="px-5 py-3 text-slate">
                    {r.avg ? `${r.avg} / 5` : r.count > 0 ? "Not enough responses yet" : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
