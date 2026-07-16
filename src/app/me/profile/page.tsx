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
      <p className="text-sm text-slate">
        No profile found yet. Contact your Masy HR contact.
      </p>
    );
  }

  return (
    <div className="max-w-md rounded-card border border-border bg-paper p-6">
      <h1 className="mb-4 text-lg font-bold text-ink">My profile</h1>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate">Name</dt>
          <dd className="font-medium text-ink">{employee.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Role</dt>
          <dd className="font-medium text-ink">{employee.roleTitle}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Organization</dt>
          <dd className="font-medium text-ink">{employee.clientOrg.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Status</dt>
          <dd><StatusBadge status={employee.status} /></dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Start date</dt>
          <dd className="font-mono text-xs text-ink">{employee.startDate.toLocaleDateString()}</dd>
        </div>
      </dl>
    </div>
  );
}
