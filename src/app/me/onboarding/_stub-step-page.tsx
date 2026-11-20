import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ONBOARDING_STEP_LABELS } from "@/lib/onboarding";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import type { OnboardingStepType } from "@/generated/prisma/client";

// Shared shell for steps not yet built out -- keeps the overview page's links working and
// honest about what's there, instead of 404ing.
export async function StubStepPage({ stepType }: { stepType: OnboardingStepType }) {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;
  if (!employeeId) redirect("/me/profile");

  const process = await db.onboardingProcess.findUnique({ where: { employeeId }, include: { steps: true } });
  if (!process) redirect("/me/profile");

  const step = process.steps.find((s) => s.stepType === stepType);
  if (!step) redirect("/me/onboarding");

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{ONBOARDING_STEP_LABELS[stepType]}</h1>
        </div>
        <OnboardingStepStatusBadge status={step.status} />
      </div>
      <div className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
        This step is being built. Check back shortly, or contact our team if your start date is close.
      </div>
      <Link href="/me/onboarding" className="text-sm font-medium text-indigo hover:text-indigo-light">&larr; Back to onboarding</Link>
    </div>
  );
}
