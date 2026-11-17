import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { IdentityDocumentsForm } from "./identity-documents-form";

export default async function IdentityDocumentsStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "IDENTITY_DOCUMENTS");
  if (!step) redirect("/me/onboarding");

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Identity & address documents</h1>
          <p className="text-sm text-slate">These stay private to HR -- your employer never sees the files themselves.</p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          HR asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Verified -- this step is locked.</p>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Submitted -- waiting on HR to verify.</p>
        </div>
      ) : (
        <IdentityDocumentsForm />
      )}
    </div>
  );
}
