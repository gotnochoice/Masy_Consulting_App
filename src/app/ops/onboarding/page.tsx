import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { ONBOARDING_STEP_ORDER, ONBOARDING_STEP_LABELS } from "@/lib/onboarding";
import { OnboardingStepStatusBadge } from "@/components/onboarding-step-status-badge";
import { verifyOnboardingStep, toggleOnboardingTask } from "./actions";
import { CorrectionForm } from "./correction-form";
import { CompleteButton } from "./complete-button";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function OpsOnboardingPage() {
  await requireRole("MASY_OPS");

  const processes = await db.onboardingProcess.findMany({
    where: { completedAt: null },
    include: {
      employee: {
        include: {
          clientOrg: true,
        },
      },
      steps: true,
    },
    orderBy: { commencementDate: "asc" },
  });

  const employees = await db.employee.findMany({
    where: { onboardingTasks: { some: {} } },
    include: { clientOrg: true, onboardingTasks: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ clientOrg: { name: "asc" } }, { startDate: "desc" }],
  });

  return (
    <div className="space-y-10">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Onboarding</h1>
        <p className="text-sm text-slate">Compulsory onboarding verification, and the quick post-start checklist below it.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-ink">Verification queue</h2>
        {processes.map((process) => {
          const { employee } = process;
          // Overriding stepType with the loop variable narrows it to ONBOARDING_STEP_ORDER's
          // 3-step union instead of the full Prisma enum (which still includes
          // PROPERTY_HANDOVER, GUARANTORS, and SIGNATURE, all currently out of this sequence --
          // see onboarding.ts).
          const orderedSteps = ONBOARDING_STEP_ORDER.flatMap((t) => {
            const step = process.steps.find((s) => s.stepType === t);
            return step ? [{ ...step, stepType: t }] : [];
          });
          const flags = orderedSteps.filter((s) => s.status === "NEEDS_CORRECTION").length;
          const days = daysUntil(process.commencementDate);

          return (
            <div key={process.id} className="space-y-4 rounded-card border border-border bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <a href={`/ops/employees/${employee.id}/edit`} className="text-sm font-medium text-ink hover:text-indigo hover:underline">
                    {employee.name}
                  </a>
                  <p className="text-xs text-slate-light">{employee.clientOrg.name}</p>
                  <p className="text-xs text-slate-light">Review their NIN and uploaded documents there before verifying identity documents.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={days < 0 ? "font-medium text-orange" : "text-slate-light"}>
                    {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days to start`}
                  </span>
                  {flags > 0 && (
                    <span className="rounded-btn bg-orange-light/40 px-2 py-0.5 font-medium text-orange">{flags} flagged</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {orderedSteps.map((step) => {
                  const verifyWithId = verifyOnboardingStep.bind(null, step.id);
                  return (
                    <div key={step.id} data-step={step.stepType} className="space-y-1.5 rounded-btn border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-ink">{ONBOARDING_STEP_LABELS[step.stepType]}</p>
                        <OnboardingStepStatusBadge status={step.status} />
                      </div>

                      {(step.status === "SUBMITTED" || step.status === "NEEDS_CORRECTION") && (
                        <div className="flex items-center gap-3">
                          <form action={verifyWithId}>
                            <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">Mark verified</button>
                          </form>
                          <CorrectionForm stepId={step.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <CompleteButton employeeId={employee.id} />
            </div>
          );
        })}
        {processes.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No one is mid-onboarding right now.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Post-start checklist</h2>
        {employees.map((employee) => {
          const done = employee.onboardingTasks.filter((t) => t.done).length;
          const total = employee.onboardingTasks.length;
          return (
            <div key={employee.id} className="rounded-card border border-border bg-paper p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{employee.name}</p>
                  <p className="text-xs text-slate">{employee.clientOrg.name}</p>
                </div>
                <span
                  className={`rounded-btn px-2.5 py-0.5 text-xs font-medium ${
                    done === total ? "bg-indigo-tint text-indigo" : "bg-orange-light/40 text-orange"
                  }`}
                >
                  {done}/{total}
                </span>
              </div>
              <ul className="space-y-1">
                {employee.onboardingTasks.map((task) => {
                  const toggleWithId = toggleOnboardingTask.bind(null, task.id);
                  return (
                    <li key={task.id}>
                      <form action={toggleWithId}>
                        <button
                          type="submit"
                          className={`flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm transition-colors ${
                            task.done ? "text-slate-light line-through" : "text-ink hover:bg-paper-2"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              task.done ? "border-indigo bg-indigo text-white" : "border-border"
                            }`}
                          >
                            {task.done ? "✓" : ""}
                          </span>
                          {task.label}
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {employees.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No checklists yet. They&apos;re created automatically when onboarding completes or an employee is added.
          </p>
        )}
      </div>
    </div>
  );
}
