import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { toggleOnboardingTask } from "./actions";

export default async function OpsOnboardingPage() {
  await requireRole("MASY_OPS");

  const employees = await db.employee.findMany({
    where: { onboardingTasks: { some: {} } },
    include: { clientOrg: true, onboardingTasks: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ clientOrg: { name: "asc" } }, { startDate: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Onboarding</h1>
        <p className="text-sm text-slate">New hire checklists across every client organization.</p>
      </div>

      <div className="space-y-4">
        {employees.map((employee) => {
          const done = employee.onboardingTasks.filter((t) => t.done).length;
          const total = employee.onboardingTasks.length;
          return (
            <div key={employee.id} className="rounded-card border border-border bg-paper shadow-sm p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{employee.name}</p>
                  <p className="text-xs text-slate">{employee.clientOrg.name}</p>
                </div>
                <span
                  className={`rounded-btn px-2.5 py-0.5 font-mono text-xs font-medium ${
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
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No onboarding checklists yet — they&apos;re created automatically when you add a new employee.
          </p>
        )}
      </div>
    </div>
  );
}
