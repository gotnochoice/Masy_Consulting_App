import { Cake, Award } from "lucide-react";
import { Panel, PanelEmptyRow } from "@/components/panel";
import { type Milestone, formatMilestoneWhen } from "@/lib/milestones";

export function MilestonesPanel({ milestones, showOrg = false }: { milestones: Milestone[]; showOrg?: boolean }) {
  return (
    <Panel title="Upcoming birthdays & anniversaries">
      {milestones.length === 0 && <PanelEmptyRow>Nothing in the next 30 days.</PanelEmptyRow>}
      {milestones.map((m) => {
        const Icon = m.type === "birthday" ? Cake : Award;
        return (
          <div key={`${m.employeeId}-${m.type}`} className="flex items-center gap-3 px-5 py-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                m.type === "birthday" ? "bg-orange-light/40 text-orange" : "bg-indigo-tint text-indigo"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {m.employeeName}
                {showOrg && <span className="font-normal text-slate-light"> · {m.orgName}</span>}
              </p>
              <p className="text-xs text-slate">{m.type === "birthday" ? "Birthday" : `${m.years}-year anniversary`}</p>
            </div>
            <p className="shrink-0 font-mono text-xs text-slate-light">{formatMilestoneWhen(m.daysAway)}</p>
          </div>
        );
      })}
    </Panel>
  );
}
