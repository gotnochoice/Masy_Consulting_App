import { Users, Building2, Clock, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly, formatDate } from "@/lib/attendance";
import { upcomingMilestones } from "@/lib/milestones";
import { StatCard } from "@/components/stat-card";
import { Panel, PanelEmptyRow } from "@/components/panel";
import { MilestonesPanel } from "@/components/milestones-panel";
import { CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { ClientLogo } from "@/components/client-logo";

const FUNNEL_STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED"] as const;

export default async function OpsOverviewPage() {
  await requireRole("MASY_OPS");

  const today = todayDateOnly();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const monthLabel = new Date().toLocaleDateString([], { year: "numeric", month: "long" });

  const [
    employeeCount,
    orgCount,
    todayClockIns,
    incompleteThisMonth,
    orgs,
    recentAttendance,
    allEmployees,
    candidateStageCounts,
  ] = await Promise.all([
    db.employee.count(),
    db.clientOrg.count(),
    db.attendanceRecord.count({ where: { date: today } }),
    db.attendanceRecord.count({
      where: { date: { gte: monthStart, lt: monthEnd }, clockOut: null },
    }),
    db.clientOrg.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
    db.attendanceRecord.findMany({
      include: { employee: { include: { clientOrg: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      include: { clientOrg: true },
    }),
    db.candidate.groupBy({
      by: ["stage"],
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
      _count: { _all: true },
    }),
  ]);

  const milestones = upcomingMilestones(allEmployees);
  const countByStage = new Map(candidateStageCounts.map((c) => [c.stage, c._count._all]));
  const totalApplicants = FUNNEL_STAGES.reduce((sum, stage) => sum + (countByStage.get(stage) ?? 0), 0);
  const rejectedThisMonth = countByStage.get("REJECTED") ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Admin Overview</h1>
        <p className="text-sm text-slate">{monthLabel}, everything at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StatCard label="Total employees" value={employeeCount} icon={Users} size="large" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
          <StatCard label="Client organizations" value={orgCount} icon={Building2} />
          <StatCard label="Clocked in today" value={todayClockIns} icon={Clock} />
          <StatCard label="Attendance flags this month" value={incompleteThisMonth} icon={AlertTriangle} tone="orange" />
        </div>
      </div>

      <div className="rounded-card border border-border bg-paper p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Hiring funnel this month</h2>
          {rejectedThisMonth > 0 && (
            <p className="text-xs text-slate-light">{rejectedThisMonth} rejected, not shown</p>
          )}
        </div>
        {totalApplicants > 0 ? (
          <div className="flex flex-wrap items-stretch gap-3">
            {FUNNEL_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-stretch gap-3">
                <div className="min-w-[92px] rounded-btn bg-paper-2 px-4 py-3">
                  <p className="text-xl font-bold tracking-tight text-ink">{countByStage.get(stage) ?? 0}</p>
                  <p className="text-xs text-slate-light">{CANDIDATE_STAGE_LABELS[stage]}</p>
                </div>
                {i < FUNNEL_STAGES.length - 1 && (
                  <span className="self-center text-slate-light" aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-light">No applicants yet this month.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Client organizations">
          {orgs.map((org) => (
            <div key={org.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <ClientLogo name={org.name} logoUrl={org.logoUrl} />
                <div>
                  <p className="text-sm font-medium text-ink">{org.name}</p>
                  <p className="text-xs text-slate">{org._count.employees} employees</p>
                </div>
              </div>
              <span className="rounded-btn bg-indigo-tint px-2.5 py-0.5 text-xs font-medium text-indigo">
                {org.status}
              </span>
            </div>
          ))}
          {orgs.length === 0 && <PanelEmptyRow>No client organizations yet.</PanelEmptyRow>}
        </Panel>

        <Panel title="Recent attendance activity">
          {recentAttendance.map((record) => (
            <div key={record.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{record.employee.name}</p>
                <p className="text-xs text-slate">
                  {record.employee.clientOrg.name} · {formatDate(record.date)}
                </p>
              </div>
              {record.clockOut ? (
                <span className="rounded-btn bg-indigo-tint px-2.5 py-0.5 text-xs font-medium text-indigo">
                  Complete
                </span>
              ) : (
                <span className="rounded-btn bg-orange-light/40 px-2.5 py-0.5 text-xs font-medium text-orange">
                  Open
                </span>
              )}
            </div>
          ))}
          {recentAttendance.length === 0 && <PanelEmptyRow>No attendance recorded yet.</PanelEmptyRow>}
        </Panel>

        <MilestonesPanel milestones={milestones} showOrg />
      </div>
    </div>
  );
}
