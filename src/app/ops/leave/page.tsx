import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { leaveDaysBetween, formatDateShort } from "@/lib/leave";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { approveLeave, denyLeave } from "./actions";

export default async function OpsLeavePage() {
  await requireRole("MASY_OPS");

  const requests = await db.leaveRequest.findMany({
    include: { employee: { include: { clientOrg: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Leave requests</h1>
        <p className="text-sm text-slate">Across all client organizations.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Employee</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Type</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Dates</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-paper-2">
                <td className="px-4 py-3 font-medium text-ink">{r.employee.name}</td>
                <td className="px-4 py-3 text-slate">{r.employee.clientOrg.name}</td>
                <td className="px-4 py-3 capitalize text-slate">{r.type.toLowerCase()}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate">
                  {formatDateShort(r.startDate)} – {formatDateShort(r.endDate)} ({leaveDaysBetween(r.startDate, r.endDate)}d)
                </td>
                <td className="px-4 py-3"><LeaveStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "PENDING" && (
                    <div className="flex justify-end gap-3">
                      <form action={approveLeave.bind(null, r.id)}>
                        <button type="submit" className="text-sm font-medium text-indigo hover:text-indigo-light">
                          Approve
                        </button>
                      </form>
                      <form action={denyLeave.bind(null, r.id)}>
                        <button type="submit" className="text-sm font-medium text-slate hover:text-ink">
                          Deny
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate">No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
