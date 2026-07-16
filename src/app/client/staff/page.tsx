import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";

export default async function ClientStaffPage() {
  const session = await requireRole("CLIENT");

  const employees = await db.employee.findMany({
    where: { clientOrgId: session.user.clientOrgId ?? "__none__" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Your team</h1>
        <p className="text-sm text-slate">Read-only. Reach out to your Masy HR contact for changes.</p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper">
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
                <td className="px-5 py-3 font-medium text-ink">{employee.name}</td>
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
  );
}
