import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { updateMyDetails } from "../actions";
import { MyDetailsForm } from "../employee-form";

export default async function EditMyDetailsPage() {
  const session = await requireRole("EMPLOYEE");
  if (!session.user.employeeId) notFound();

  const employee = await db.employee.findUnique({ where: { id: session.user.employeeId } });
  if (!employee) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Edit your details</h1>
      <p className="text-sm text-slate">
        Keep your contact info current so Masy and your organization can reach you when it matters.
      </p>
      <MyDetailsForm employee={employee} action={updateMyDetails} />
    </div>
  );
}
