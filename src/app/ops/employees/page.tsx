import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";
import { createEmployee } from "./actions";
import { EmployeeForm } from "./employee-form";

export default async function OpsEmployeesPage() {
  await requireRole("MASY_OPS");

  const [employees, orgs] = await Promise.all([
    db.employee.findMany({
      include: { clientOrg: true },
      orderBy: [{ clientOrg: { name: "asc" } }, { name: "asc" }],
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Employee directory</h1>
        <p className="text-sm text-neutral-500">All staff across every client organization.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Organization</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Role</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Start date</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-4 py-2 text-neutral-900">{employee.name}</td>
                <td className="px-4 py-2 text-neutral-600">{employee.clientOrg.name}</td>
                <td className="px-4 py-2 text-neutral-600">{employee.roleTitle}</td>
                <td className="px-4 py-2"><StatusBadge status={employee.status} /></td>
                <td className="px-4 py-2 text-neutral-600">{employee.startDate.toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/ops/employees/${employee.id}/edit`} className="text-neutral-500 hover:text-neutral-900">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">No employees yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Add employee</h2>
        <EmployeeForm orgs={orgs} action={createEmployee} submitLabel="Add employee" />
      </div>
    </div>
  );
}
