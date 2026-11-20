import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { SuccessBanner } from "@/components/success-banner";
import { LeaveCalendar } from "@/components/leave-calendar";
import { approveLeave, denyLeave } from "./actions";

export default async function ClientLeavePage() {
  const session = await requireRole("CLIENT");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [requests, approvedThisMonth] = await Promise.all([
    db.leaveRequest.findMany({
      where: { employee: scopedEmployeeWhere(session) },
      include: { employee: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.leaveRequest.findMany({
      where: {
        employee: scopedEmployeeWhere(session),
        status: "APPROVED",
        startDate: { lt: monthEnd },
        endDate: { gte: monthStart },
      },
      include: { employee: true },
    }),
  ]);

  const leaveByDay = new Map<number, { employeeName: string; type: string }[]>();
  for (const r of approvedThisMonth) {
    const rangeStart = r.startDate > monthStart ? r.startDate : monthStart;
    const rangeEndExclusive = r.endDate < monthEnd ? new Date(r.endDate.getTime() + 86_400_000) : monthEnd;
    for (let d = new Date(rangeStart); d < rangeEndExclusive; d = new Date(d.getTime() + 86_400_000)) {
      const day = d.getUTCDate();
      const entries = leaveByDay.get(day) ?? [];
      entries.push({ employeeName: r.employee.name, type: r.type });
      leaveByDay.set(day, entries);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Leave approvals</h1>
        <p className="text-sm text-slate">Approve or decline leave for your team, the one action you take directly.</p>
      </div>

      <SuccessBanner />

      <div className="rounded-card border border-border bg-paper p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-light">
          {monthStart.toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
        <LeaveCalendar monthStart={monthStart} leaveByDay={leaveByDay} />
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-indigo-tint">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Employee</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Dates</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Reason</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-medium text-ink">{r.employee.name}</td>
                <td className="px-4 py-2.5 capitalize text-slate">{r.type.toLowerCase()}</td>
                <td className="px-4 py-2.5 text-xs text-slate">
                  {formatDateShort(r.startDate)} – {formatDateShort(r.endDate)}
                </td>
                <td className="px-4 py-2.5 text-slate">{r.reason || "-"}</td>
                <td className="px-4 py-2.5"><LeaveStatusBadge status={r.status} /></td>
                <td className="px-4 py-2.5 text-right">
                  {r.status === "PENDING" && (
                    <div className="flex justify-end gap-3">
                      <form action={approveLeave.bind(null, r.id)}>
                        <input type="hidden" name="redirectTo" value="/client/leave" />
                        <button
                          type="submit"
                          className="rounded-btn bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-light"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyLeave.bind(null, r.id)}>
                        <input type="hidden" name="redirectTo" value="/client/leave" />
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
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-light">No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
