import Link from "next/link";
import { ONBOARDING_STEP_ORDER, ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ROUTES } from "@/lib/onboarding";

type StepType = (typeof ONBOARDING_STEP_ORDER)[number];

// Steps are freely navigable in any order -- fill in whatever you have ready and come back for
// the rest later. Only the overall onboarding-completion gate (completeOnboarding) requires
// every step to actually be finished before HR can close it out; this nav never blocks anything.
export function OnboardingStepNav({ current }: { current: StepType }) {
  const idx = ONBOARDING_STEP_ORDER.indexOf(current);
  const prior = idx > 0 ? ONBOARDING_STEP_ORDER[idx - 1] : null;
  const next = idx < ONBOARDING_STEP_ORDER.length - 1 ? ONBOARDING_STEP_ORDER[idx + 1] : null;

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
        <Link href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[next]}`} className="font-medium text-indigo hover:text-indigo-light">
          {ONBOARDING_STEP_LABELS[next]} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
