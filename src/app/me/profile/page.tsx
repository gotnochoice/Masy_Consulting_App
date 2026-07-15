import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/status-badge";

export default async function MyProfilePage() {
  const session = await requireRole("EMPLOYEE");

  const employee = session.user.employeeId
    ? await db.employee.findUnique({
        where: { id: session.user.employeeId },
        include: { clientOrg: true },
      })
    : null;

  if (!employee) {
    return (
      <p className="text-sm text-neutral-500">
        No profile found yet. Contact your Masy HR contact.
      </p>
    );
  }

  return (
    <div className="max-w-md rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="mb-4 text-lg font-semibold text-neutral-900">My profile</h1>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500">Name</dt>
          <dd className="text-neutral-900">{employee.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Role</dt>
          <dd className="text-neutral-900">{employee.roleTitle}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Organization</dt>
          <dd className="text-neutral-900">{employee.clientOrg.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Status</dt>
          <dd><StatusBadge status={employee.status} /></dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500">Start date</dt>
          <dd className="text-neutral-900">{employee.startDate.toLocaleDateString()}</dd>
        </div>
      </dl>
    </div>
  );
}
