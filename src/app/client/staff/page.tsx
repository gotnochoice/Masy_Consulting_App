import { Users, UserCheck, CalendarDays, Clock3 } from "lucide-react";
import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { StatusBadge } from "@/components/status-badge";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { StatCard } from "@/components/stat-card";
import { SuccessBanner } from "@/components/success-banner";
import { approveLeave, denyLeave } from "../leave/actions";

export default async function ClientStaffPage() {
  const session = await requireRole("CLIENT");

  const [org, employees, recentLeave, pendingLeaveCount] = await Promise.all([
    session.user.clientOrgId
      ? db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } })
      : null,
    db.employee.findMany({
      where: { clientOrgId: session.user.clientOrgId ?? "__none__" },
      orderBy: { name: "asc" },
    }),
    db.leaveRequest.findMany({
      where: { employee: scopedEmployeeWhere(session) },
      include: { employee: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    db.leaveRequest.count({ where: { employee: scopedEmployeeWhere(session), status: "PENDING" } }),
  ]);

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const onLeaveCount = employees.filter((e) => e.status === "ON_LEAVE").length;
  const today = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-indigo">{today}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{org?.name ?? "Your team"}</h1>
        <p className="mt-1 text-sm text-slate">Here is how your team is doing right now.</p>
      </div>

      <SuccessBanner />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Team size" value={employees.length} icon={Users} />
        <StatCard label="Active" value={activeCount} icon={UserCheck} />
        <StatCard label="On leave" value={onLeaveCount} icon={CalendarDays} />
        <StatCard label="Pending leave" value={pendingLeaveCount} icon={Clock3} tone="orange" />
      </div>

      {recentLeave.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">Recent leave requests</h2>
          <div className="space-y-3">
            {recentLeave.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-card border border-border bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.employee.name}{" "}
                    <span className="font-normal capitalize text-slate">· {r.type.toLowerCase()} leave</span>
                  </p>
                  <p className="font-mono text-xs text-slate-light">
                    {formatDateShort(r.startDate)} to {formatDateShort(r.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <LeaveStatusBadge status={r.status} />
                  {r.status === "PENDING" && (
                    <div className="flex gap-3">
                      <form action={approveLeave.bind(null, r.id)}>
                        <input type="hidden" name="redirectTo" value="/client/staff" />
                        <button
                          type="submit"
                          className="rounded-btn bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-light"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={denyLeave.bind(null, r.id)}>
                        <input type="hidden" name="redirectTo" value="/client/staff" />
                        <button type="submit" className="text-sm font-medium text-slate hover:text-ink">
                          Decline
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-ink">Your team</h2>
          <p className="text-xs text-slate-light">Read-only. Reach out to your Masy HR contact for changes.</p>
        </div>
        <div className="overflow-x-auto rounded-card border border-border bg-paper">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-indigo-tint">
              <tr>
                <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Name</th>
                <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Role</th>
                <th className="px-5 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide text-indigo">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-tint text-xs font-semibold text-indigo">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-ink">{employee.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate">{employee.roleTitle}</td>
                  <td className="px-5 py-3"><StatusBadge status={employee.status} /></td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-light">No staff on record yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
