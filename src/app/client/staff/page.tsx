import { Users, UserCheck, CalendarDays } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";

export default async function ClientStaffPage() {
  const session = await requireRole("CLIENT");

  const [org, employees] = await Promise.all([
    session.user.clientOrgId
      ? db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } })
      : null,
    db.employee.findMany({
      where: { clientOrgId: session.user.clientOrgId ?? "__none__" },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCount = employees.filter((e) => e.status === "ACTIVE").length;
  const onLeaveCount = employees.filter((e) => e.status === "ON_LEAVE").length;
  const today = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-indigo">{today}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink sm:text-4xl">{org?.name ?? "Your team"}</h1>
        <p className="mt-1 text-sm text-slate">Here is how your team is doing right now.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Team size" value={employees.length} icon={Users} />
        <StatCard label="Active" value={activeCount} icon={UserCheck} />
        <StatCard label="On leave" value={onLeaveCount} icon={CalendarDays} tone="orange" />
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-ink">Your team</h2>
          <p className="text-xs text-slate-light">Read-only. Reach out to your Masy HR contact for changes.</p>
        </div>
        <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-sm">
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
                  <td colSpan={3} className="px-5 py-6 text-center text-sm text-slate">No staff on record yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
