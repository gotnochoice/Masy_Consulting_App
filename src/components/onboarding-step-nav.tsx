import Link from "next/link";
import { ONBOARDING_STEP_ORDER, ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ROUTES } from "@/lib/onboarding";

type StepType = (typeof ONBOARDING_STEP_ORDER)[number];
type StepStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "NEEDS_CORRECTION" | "VERIFIED";

// Every step page gated on reaching it too early, but had no way to move between steps except
// the client-side redirect right after a successful submit -- reload that page, or come back to
// it later, and there was no link anywhere back to the overview or on to what's next. This sits
// just under each step's header.
export function OnboardingStepNav({ current, currentStatus }: { current: StepType; currentStatus: StepStatus }) {
  const idx = ONBOARDING_STEP_ORDER.indexOf(current);
  const prior = idx > 0 ? ONBOARDING_STEP_ORDER[idx - 1] : null;
  const next = idx < ONBOARDING_STEP_ORDER.length - 1 ? ONBOARDING_STEP_ORDER[idx + 1] : null;
  const canContinue = next && (currentStatus === "SUBMITTED" || currentStatus === "VERIFIED");

  return (
    <div className="flex items-center justify-between border-b border-border pb-3 text-xs">
      {prior ? (
        <Link href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[prior]}`} className="font-medium text-indigo hover:text-indigo-light">
          ← {ONBOARDING_STEP_LABELS[prior]}
        </Link>
      ) : (
        <Link href="/me/onboarding" className="font-medium text-indigo hover:text-indigo-light">
          ← Overview
        </Link>
      )}
      <span className="text-slate-light">Step {idx + 1} of {ONBOARDING_STEP_ORDER.length}</span>
      {next ? (
        canContinue ? (
          <Link href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[next]}`} className="font-medium text-indigo hover:text-indigo-light">
            {ONBOARDING_STEP_LABELS[next]} →
          </Link>
        ) : (
          // Shown but not a link yet -- so it's clear what's next, without implying you can
          // skip ahead before finishing this step.
          <span className="text-slate-light/60" title="Finish this step first">
            {ONBOARDING_STEP_LABELS[next]} →
          </span>
        )
      ) : (
        <span />
      )}
    </div>
  );
}
