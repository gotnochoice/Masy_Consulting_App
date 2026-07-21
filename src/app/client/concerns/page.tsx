import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";

export default async function ClientConcernsPage() {
  const session = await requireRole("CLIENT");

  const now = new Date();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(Date.UTC(now.getFullYear(), quarterStartMonth, 1));

  const [totalThisQuarter, resolvedThisQuarter, released] = await Promise.all([
    db.concern.count({
      where: { employee: scopedEmployeeWhere(session), createdAt: { gte: quarterStart } },
    }),
    db.concern.count({
      where: {
        employee: scopedEmployeeWhere(session),
        createdAt: { gte: quarterStart },
        visibility: "CLIENT_VISIBLE",
      },
    }),
    db.concern.findMany({
      where: { employee: scopedEmployeeWhere(session), visibility: "CLIENT_VISIBLE" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Concerns</h1>
        <p className="text-sm text-slate">
          A summary view only — individual submissions go to your Masy HR contact, never straight to you. This
          keeps it safe for your team to raise things honestly.
        </p>
      </div>

      <div className="rounded-card border border-border bg-indigo-tint p-5">
        <p className="text-sm text-indigo">
          <span className="font-mono font-semibold">{totalThisQuarter}</span> concern
          {totalThisQuarter === 1 ? "" : "s"} raised this quarter
          {resolvedThisQuarter > 0 && (
            <>
              , <span className="font-mono font-semibold">{resolvedThisQuarter}</span> shared with a resolution
              summary below
            </>
          )}
          .
        </p>
      </div>

      <div className="space-y-3">
        {released.map((concern) => (
          <div key={concern.id} className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-5">
            <p className="text-sm text-ink">{concern.curatedSummary}</p>
            <p className="mt-2 font-mono text-xs text-slate-light">Updated {formatDateShort(concern.updatedAt)}</p>
          </div>
        ))}
        {released.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] px-5 py-6 text-center text-sm text-slate">
            Nothing to share right now.
          </p>
        )}
      </div>
    </div>
  );
}
