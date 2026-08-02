import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { updateEmployeeDetails } from "../../actions";
import { ClientEmployeeForm } from "../../employee-form";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("CLIENT");
  const { id } = await params;

  const employee = await db.employee.findUnique({ where: { id } });
  if (!employee || employee.clientOrgId !== session.user.clientOrgId) notFound();

  const updateWithId = updateEmployeeDetails.bind(null, employee.id);

  return (
    <div className="max-w-lg space-y-6">
      <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Edit staff details</h1>
      <p className="text-sm text-slate">
        Correct anything that&rsquo;s out of date. Status, leave balance, and pay are managed by your Masy HR contact.
      </p>
      <ClientEmployeeForm employee={employee} action={updateWithId} />
    </div>
  );
}
