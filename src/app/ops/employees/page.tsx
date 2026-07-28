import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatTenure } from "@/lib/tenure";
import { StatusBadge } from "@/components/status-badge";
import { ResetPasswordForm } from "@/components/reset-password-form";
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
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Employee directory</h1>
        <p className="text-sm text-slate">All staff across every client organization.</p>
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Start date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Tenure</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Login</th>
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
                <td className="px-4 py-3 text-xs text-slate">{employee.startDate.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate">{formatTenure(employee.startDate)}</td>
                <td className="px-4 py-3">
                  {employee.user ? (
                    <div className="flex items-center justify-end gap-3">
                      <span className="rounded-btn bg-indigo-tint px-2.5 py-0.5 text-xs font-medium text-indigo">
                        Active
                      </span>
                      <ResetPasswordForm userId={employee.user.id} />
                    </div>
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
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-light">No employees yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add employee</h2>
        <EmployeeForm orgs={orgs} defaultOrgId={defaultOrgId} action={createEmployee} submitLabel="Add employee" />
      </div>
    </div>
  );
}
