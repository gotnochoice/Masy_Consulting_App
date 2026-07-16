import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { approveLeave, denyLeave } from "./actions";

export default async function ClientLeavePage() {
  const session = await requireRole("CLIENT");

  const requests = await db.leaveRequest.findMany({
    where: { employee: scopedEmployeeWhere(session) },
    include: { employee: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Leave approvals</h1>
        <p className="text-sm text-slate">Approve or decline leave for your team — the one action you take directly.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-indigo-tint">
            <tr>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Employee</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Type</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Dates</th>
              <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-medium text-ink">{r.employee.name}</td>
                <td className="px-5 py-3 capitalize text-slate">{r.type.toLowerCase()}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate">
                  {formatDateShort(r.startDate)} – {formatDateShort(r.endDate)}
                </td>
                <td className="px-5 py-3"><LeaveStatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-right">
                  {r.status === "PENDING" && (
                    <div className="flex justify-end gap-3">
                      <form action={approveLeave.bind(null, r.id)}>
                        <button
                          type="submit"
                          className="rounded-btn bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-light"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyLeave.bind(null, r.id)}>
                        <button type="submit" className="text-sm font-medium text-slate hover:text-ink">
                          Decline
                        </button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate">No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
