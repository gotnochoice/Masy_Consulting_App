import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent, requirePriorStepsComplete } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { listNigerianBanks } from "@/lib/bank-verification";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { OnboardingStepNav } from "@/components/onboarding-step-nav";
import { PersonalDetailsForm } from "./personal-details-form";

export default async function PersonalDetailsStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);
  await requirePriorStepsComplete(employeeId, "PERSONAL_DETAILS");

  const [employee, process] = await Promise.all([
    db.employee.findUnique({ where: { id: employeeId }, include: { clientOrg: { select: { name: true } } } }),
    db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } }),
  ]);
  if (!employee || !process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "PERSONAL_DETAILS");
  if (!step) redirect("/me/onboarding");

  const banksResult = await listNigerianBanks();
  const banks = Array.isArray(banksResult) ? banksResult : [];
  const banksError = Array.isArray(banksResult) ? null : banksResult.error;

  return (
    <div className="max-w-lg space-y-6">
      <OnboardingStepNav current="PERSONAL_DETAILS" currentStatus={step.status} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Personal details</h1>
          <p className="text-sm text-slate">Tell us a bit about yourself. Everything here is required unless marked optional.</p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          HR asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="space-y-2 rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Verified -- this step is locked.</p>
          <p className="text-indigo/80">If any of this changes, use &ldquo;Request a details update&rdquo; from your profile once you&rsquo;re fully onboarded.</p>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Submitted -- waiting on HR to verify.</p>
        </div>
      ) : (
        <PersonalDetailsForm
          employee={{
            name: employee.name,
            preferredName: employee.preferredName,
            dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString().slice(0, 10) : "",
            phone: employee.phone,
            whatsappNumber: employee.whatsappNumber,
            personalEmail: employee.personalEmail,
            address: employee.address,
            emergencyContactName: employee.emergencyContactName,
            emergencyContactPhone: employee.emergencyContactPhone,
            roleTitle: employee.roleTitle,
            clientOrgName: employee.clientOrg.name,
            shiftLabel: employee.shiftLabel,
            shiftDescription: employee.shiftDescription,
            bankAccountNumber: employee.bankAccountNumber,
            bankName: employee.bankName,
            bankAccountHolderName: employee.bankAccountHolderName,
          }}
          banks={banks}
          banksError={banksError}
        />
      )}
    </div>
  );
}
