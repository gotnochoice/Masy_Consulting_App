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
    // A grid, not a flex row: "Step N of M" sits in an auto-sized middle column so it never
    // wraps or gets squeezed -- on a narrow screen, a long step name like "Agreement, handbook
    // & quiz" on either side wraps onto its own line within its own column instead.
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 border-b border-border pb-3 text-xs">
      <div className="min-w-0">
        {prior ? (
          <Link href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[prior]}`} className="font-medium text-indigo hover:text-indigo-light">
            ← {ONBOARDING_STEP_LABELS[prior]}
          </Link>
        ) : (
          <Link href="/me/onboarding" className="font-medium text-indigo hover:text-indigo-light">
            ← Overview
          </Link>
        )}
      </div>
      <span className="shrink-0 whitespace-nowrap text-center text-slate-light">Step {idx + 1} of {ONBOARDING_STEP_ORDER.length}</span>
      <div className="min-w-0 text-right">
        {next && (
          <Link href={`/me/onboarding/${ONBOARDING_STEP_ROUTES[next]}`} className="font-medium text-indigo hover:text-indigo-light">
            {ONBOARDING_STEP_LABELS[next]} →
          </Link>
        )}
      </div>
    </div>
  );
}
