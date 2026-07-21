import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { createEmployee } from "./actions";
import { EmployeeForm } from "./employee-form";
import { InviteEmployeeForm } from "./invite-employee-form";

export default async function OpsEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  await requireRole("MASY_OPS");
  const { org: defaultOrgId } = await searchParams;

  const [employees, orgs] = await Promise.all([
    db.employee.findMany({
      include: { clientOrg: true, user: true },
      orderBy: [{ clientOrg: { name: "asc" } }, { name: "asc" }],
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Employee directory</h1>
        <p className="text-sm text-slate">All staff across every client organization.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)]">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Start date</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Login</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-paper-2">
                <td className="px-4 py-3 font-medium text-ink">{employee.name}</td>
                <td className="px-4 py-3 text-slate">{employee.clientOrg.name}</td>
                <td className="px-4 py-3 text-slate">{employee.roleTitle}</td>
                <td className="px-4 py-3"><StatusBadge status={employee.status} /></td>
                <td className="px-4 py-3 font-mono text-xs text-slate">{employee.startDate.toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {employee.user ? (
                    <span className="rounded-btn bg-indigo-tint px-2.5 py-0.5 font-mono text-xs font-medium text-indigo">
                      Active
                    </span>
                  ) : (
                    <InviteEmployeeForm employeeId={employee.id} />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/ops/employees/${employee.id}/edit`} className="text-sm font-medium text-indigo hover:text-indigo-light">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate">No employees yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add employee</h2>
        <EmployeeForm orgs={orgs} defaultOrgId={defaultOrgId} action={createEmployee} submitLabel="Add employee" />
      </div>
    </div>
  );
}
