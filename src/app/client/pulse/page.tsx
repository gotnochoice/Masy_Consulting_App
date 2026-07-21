import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PULSE_MIN_SAMPLE_SIZE } from "@/lib/pulse";

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
        <h1 className="text-3xl font-extrabold text-ink">Team pulse</h1>
        <p className="text-sm text-slate">
          A monthly average from short private check-ins with your team. Individual answers stay with Masy — this
          is trend only, and only shown once enough people have responded that no one answer stands out.
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)]">
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
                  {r.avg ? `${r.avg} / 5` : r.count > 0 ? "Not enough responses yet" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
