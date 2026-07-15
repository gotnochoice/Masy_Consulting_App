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
        <h1 className="text-lg font-semibold text-neutral-900">Your team</h1>
        <p className="text-sm text-neutral-500">Read-only. Reach out to your Masy HR contact for changes.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Role</th>
              <th className="px-4 py-2 text-left font-medium text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td className="px-4 py-2 text-neutral-900">{employee.name}</td>
                <td className="px-4 py-2 text-neutral-600">{employee.roleTitle}</td>
                <td className="px-4 py-2"><StatusBadge status={employee.status} /></td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">No staff on record yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
