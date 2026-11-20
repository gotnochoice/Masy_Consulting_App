import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent } from "@/lib/onboarding-gate";
import { requiredGuarantorCount } from "@/lib/onboarding-process";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { GuarantorsForm } from "./guarantors-form";

export default async function GuarantorsStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);

  const [process, guarantors, required] = await Promise.all([
    db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } }),
    db.guarantor.findMany({ where: { employeeId, replacedAt: null }, orderBy: { createdAt: "asc" } }),
    requiredGuarantorCount(employeeId),
  ]);
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "GUARANTORS");
  if (!step) redirect("/me/onboarding");

  const toValues = (g: (typeof guarantors)[number] | undefined) =>
    g
      ? { name: g.name, relationship: g.relationship, phone: g.phone, email: g.email, occupation: g.occupation ?? "", address: g.address }
      : null;

  return (
    <div className="max-w-lg space-y-6">
      {/* No OnboardingStepNav here -- guarantors is currently out of the compulsory onboarding
          sequence (see ONBOARDING_STEP_ORDER), so there's no prior/next step to navigate
          between. This page stays reachable directly for any process that still has a
          GUARANTORS row from before that change. */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{required === 1 ? "Next of kin" : "Guarantors"}</h1>
          <p className="text-sm text-slate">
            {required === 1
              ? "Someone our team can contact to verify who you are -- no company equipment is being issued for this role, so one contact is enough."
              : "Two people our team can contact to verify who you are."}
          </p>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          Our team asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Verified -- this step is locked.</p>
        </div>
      ) : step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Submitted -- waiting on our team to verify.</p>
        </div>
      ) : (
        <GuarantorsForm guarantor1={toValues(guarantors[0])} guarantor2={toValues(guarantors[1])} required={required} />
      )}
    </div>
  );
}
