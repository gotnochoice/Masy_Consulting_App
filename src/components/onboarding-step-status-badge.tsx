import type { OnboardingStepStatus } from "@/generated/prisma/client";

const STYLES: Record<OnboardingStepStatus, string> = {
  NOT_STARTED: "bg-paper-2 text-slate border border-border",
  IN_PROGRESS: "bg-orange-light/40 text-orange",
  SUBMITTED: "bg-indigo-tint text-indigo",
  NEEDS_CORRECTION: "bg-orange-light/40 text-orange",
  VERIFIED: "bg-indigo text-white",
};

const LABELS: Record<OnboardingStepStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs correction",
  VERIFIED: "Verified",
};

export function OnboardingStepStatusBadge({ status }: { status: OnboardingStepStatus }) {
  return (
    <span className={`inline-flex items-center rounded-btn px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
