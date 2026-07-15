import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { updateEmployee } from "../../actions";
import { EmployeeForm } from "../../employee-form";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const [employee, orgs] = await Promise.all([
    db.employee.findUnique({ where: { id } }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!employee) notFound();

  const updateWithId = updateEmployee.bind(null, employee.id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold text-neutral-900">Edit employee</h1>
      <EmployeeForm orgs={orgs} employee={employee} action={updateWithId} submitLabel="Save changes" />
    </div>
  );
}
