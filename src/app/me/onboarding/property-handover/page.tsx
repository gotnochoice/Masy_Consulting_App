import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { requirePrivacyConsent } from "@/lib/onboarding-gate";
import { db } from "@/lib/db";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { PropertyHandoverFlow } from "./property-handover-flow";

export default async function PropertyHandoverStepPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");
  await requirePrivacyConsent(employeeId);

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === "PROPERTY_HANDOVER");
  if (!step) redirect("/me/onboarding");

  const assets = await db.companyAsset.findMany({ where: { employeeId }, orderBy: { createdAt: "asc" } });
  const hasNoEquipmentSentinel = assets.some((a) => a.itemType === "NO_EQUIPMENT_ISSUED");
  const realAssets = assets.filter((a) => a.itemType !== "NO_EQUIPMENT_ISSUED");
  const allReady = realAssets.length > 0 && realAssets.every((a) => a.verifiedAt && a.managementApprovedAt);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Company property handover</h1>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>

      {step.status === "NEEDS_CORRECTION" && step.correctionReason && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4 text-sm text-orange">
          HR asked for a correction: {step.correctionReason}
        </div>
      )}

      {step.status === "VERIFIED" || step.status === "SUBMITTED" ? (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">
            {hasNoEquipmentSentinel ? "No equipment is being issued to you for this role." : step.status === "VERIFIED" ? "Verified -- this step is complete." : "Signed -- waiting on HR to verify."}
          </p>
        </div>
      ) : realAssets.length === 0 ? (
        <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
          Waiting on HR to record your equipment, or confirm none is needed. Check back shortly.
        </p>
      ) : (
        <PropertyHandoverFlow
          assets={realAssets.map((a) => ({
            id: a.id,
            itemType: a.itemType,
            brand: a.brand,
            model: a.model,
            serialOrImei: a.serialOrImei,
            accessories: a.accessories,
            conditionNotes: a.conditionNotes,
            verifiedAt: a.verifiedAt,
            managementApprovedAt: a.managementApprovedAt,
            employeeDisagreesNote: a.employeeDisagreesNote,
          }))}
          allReady={allReady}
        />
      )}
    </div>
  );
}
