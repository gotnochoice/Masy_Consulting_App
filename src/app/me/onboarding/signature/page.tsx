import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent, requirePriorStepsComplete } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { OnboardingStepNav } from "@/components/onboarding-step-nav";
import { SignatureFlow } from "./signature-flow";

export default async function SignatureStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);
  await requirePriorStepsComplete(employeeId, "SIGNATURE");

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "SIGNATURE");
  if (!step) redirect("/me/onboarding");

  const signatures = await db.eSignature.findMany({
    where: { employeeId, documentType: { in: ["EMPLOYMENT_AGREEMENT", "HANDBOOK"] } },
    select: { documentType: true, countersignedAt: true, pdfUrl: true },
  });
  const agreementSig = signatures.find((s) => s.documentType === "EMPLOYMENT_AGREEMENT");
  const handbookSig = signatures.find((s) => s.documentType === "HANDBOOK");

  return (
    <div className="max-w-lg space-y-6">
      <OnboardingStepNav current="SIGNATURE" currentStatus={step.status} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Signature</h1>
          <p className="text-sm text-slate">Sign your Employment Agreement and Handbook. Your employer countersigns next.</p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          HR asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="space-y-3 rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Countersigned -- this step is complete.</p>
          <div className="space-x-4">
            {agreementSig?.pdfUrl && <a href={agreementSig.pdfUrl} target="_blank" rel="noreferrer" className="underline">Signed agreement</a>}
            {handbookSig?.pdfUrl && <a href={handbookSig.pdfUrl} target="_blank" rel="noreferrer" className="underline">Signed handbook</a>}
          </div>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Signed -- waiting on your employer to countersign.</p>
        </div>
      ) : (
        <SignatureFlow initialDone={{ agreement: !!agreementSig, handbook: !!handbookSig }} />
      )}
    </div>
  );
}
