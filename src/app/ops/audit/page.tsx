import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";

function humanizeAction(action: string) {
  return action.replace(/[._]/g, " ");
}

export default async function OpsAuditPage() {
  await requireRole("MASY_OPS");

  const logs = await db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 300 });
  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true },
  });
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Audit log</h1>
        <p className="text-sm text-slate">The {logs.length} most recent admin actions across the platform.</p>
      </div>

      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {logs.map((log) => {
          const actor = actorById.get(log.actorId);
          return (
            <div key={log.id} className="rounded-card border border-border bg-paper p-4">
              <p className="text-sm font-medium capitalize text-ink">{humanizeAction(log.action)}</p>
              <p className="mt-1 text-xs text-slate">
                {log.targetType} · {log.targetId}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-light">
                <span>{actor?.email ?? "Unknown user"}</span>
                <span>{log.timestamp.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-4 py-8 text-center text-sm text-slate-light">
            No activity recorded yet.
          </p>
        )}
      </div>

      {/* Desktop: table */}
      {logs.length > 0 && (
        <div className="hidden overflow-x-auto rounded-card border border-border bg-paper sm:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-paper-2">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">When</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Actor</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Action</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => {
                const actor = actorById.get(log.actorId);
                return (
                  <tr key={log.id} className="hover:bg-paper-2">
                    <td className="px-3 py-2.5 text-xs text-slate">{log.timestamp.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate">{actor?.email ?? "Unknown user"}</td>
                    <td className="px-3 py-2.5 capitalize text-ink">{humanizeAction(log.action)}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-light">
                      {log.targetType} · {log.targetId}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
