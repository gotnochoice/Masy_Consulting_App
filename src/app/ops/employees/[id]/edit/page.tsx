import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { updateEmployee } from "../../actions";
import { EmployeeForm } from "../../employee-form";
import { DocumentManager } from "./document-manager";
import { OnboardingQuestionsManager } from "./onboarding-questions-manager";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const [employee, orgs, documents, onboardingQuestions] = await Promise.all([
    db.employee.findUnique({ where: { id } }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
    db.employeeDocument.findMany({ where: { employeeId: id }, orderBy: { createdAt: "desc" } }),
    db.onboardingQuestion.findMany({ where: { employeeId: id }, orderBy: { order: "asc" } }),
  ]);

  if (!employee) notFound();

  const updateWithId = updateEmployee.bind(null, employee.id);

  return (
    <div className="max-w-lg space-y-6">
      <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
      <h1 className="text-2xl font-bold tracking-tight text-ink">Edit employee</h1>
      <EmployeeForm orgs={orgs} employee={employee} action={updateWithId} submitLabel="Save changes" />
      <OnboardingQuestionsManager employeeId={employee.id} questions={onboardingQuestions} />
      <DocumentManager employeeId={employee.id} documents={documents} />
    </div>
  );
}
