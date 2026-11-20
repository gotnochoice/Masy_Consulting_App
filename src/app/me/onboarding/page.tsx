import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ONBOARDING_STEP_ORDER, ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ROUTES, EARLY_PRIVACY_CONSENT_NOTICE } from "@/lib/onboarding";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { recordPrivacyConsent } from "./actions";

export default async function MyOnboardingPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");

  const process = await db.onboardingProcess.findUnique({
    where: { employeeId },
    include: { steps: true },
  });

  // No process (pre-dates this module) or already complete -- nothing to show here.
  if (!process || process.completedAt) redirect("/me/profile");

  if (!process.privacyConsentAt) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Before we begin</h1>
        </div>
        <div className="whitespace-pre-wrap rounded-card border border-border bg-paper p-5 text-sm leading-relaxed text-slate">
          {EARLY_PRIVACY_CONSENT_NOTICE}
        </div>
        <form action={recordPrivacyConsent}>
          <button type="submit" className="rounded-btn bg-indigo px-4 py-2 text-sm font-medium text-white hover:bg-indigo-light">
            I understand, continue
          </button>
        </form>
      </div>
    );
  }

  const stepsByType = new Map(process.steps.map((s) => [s.stepType, s]));
  const orderedSteps = ONBOARDING_STEP_ORDER.map((stepType) => stepsByType.get(stepType)).filter((s) => !!s);
  const verifiedCount = orderedSteps.filter((s) => s.status === "VERIFIED").length;
  const total = orderedSteps.length;
  const needsCorrection = orderedSteps.filter((s) => s.status === "NEEDS_CORRECTION");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome -- let&rsquo;s get you set up</h1>
        <p className="text-sm text-slate">
          Finish every step below before your start date,{" "}
          <strong>{process.commencementDate.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}</strong>.
          You can save a step and come back to it anytime.
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Progress</span>
          <span className="text-slate-light">{verifiedCount} of {total} verified</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full rounded-full bg-indigo transition-all" style={{ width: `${(verifiedCount / total) * 100}%` }} />
        </div>
      </div>

      {needsCorrection.length > 0 && (
        <div className="rounded-card border border-orange/30 bg-orange/5 px-5 py-4">
          <p className="text-sm font-medium text-orange">Some steps need a correction before our team can verify them:</p>
          <ul className="mt-2 space-y-2">
            {needsCorrection.map((s) => (
              <li key={s.id} className="text-sm text-slate">
                <span className="font-medium">{ONBOARDING_STEP_LABELS[s.stepType]}:</span> {s.correctionReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {orderedSteps.map((step, i) => (
          <Link
            key={step.id}
            href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[step.stepType]}`}
            className="flex items-center justify-between rounded-card border border-border bg-paper px-5 py-4 hover:border-indigo/30"
          >
            <p className="text-sm font-medium text-ink">{i + 1}. {ONBOARDING_STEP_LABELS[step.stepType]}</p>
            <OnboardingStepStatusBadge status={step.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
