import { Percent, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getMonthlyReportData, monthLabelFor } from "@/lib/monthly-report";
import { StatCard } from "@/components/stat-card";
import { SuccessBanner } from "@/components/success-banner";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { saveReportNotes, emailReportToClient } from "./actions";

export default async function OpsReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; month?: string }>;
}) {
  await requireRole("MASY_OPS");
  const { org, month } = await searchParams;

  const orgs = await db.clientOrg.findMany({ orderBy: { name: "asc" } });
  const selectedOrgId = org || orgs[0]?.id;

  const now = new Date();
  const monthValue = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!selectedOrgId) {
    return (
      <div className="space-y-4">
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
        <p className="text-sm text-slate">Add a company before you can put together a report.</p>
      </div>
    );
  }

  const [report, clientLoginCount] = await Promise.all([
    getMonthlyReportData(selectedOrgId, monthValue),
    db.user.count({ where: { clientOrgId: selectedOrgId, role: "CLIENT" } }),
  ]);

  const emailWithParams = emailReportToClient.bind(null, selectedOrgId, monthValue);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
        <p className="text-sm text-slate">One shared template, what actually gets sent to each client.</p>
      </div>

      <SuccessBanner />

      <form method="get" className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="org">Company</label>
          <select id="org" name="org" defaultValue={selectedOrgId} className={inputClass}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="month">Month</label>
          <input id="month" name="month" type="month" defaultValue={monthValue} className={inputClass} />
        </div>
        <button type="submit" className={buttonClass}>View</button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate">{monthLabelFor(monthValue)}</p>
        <form action={emailWithParams}>
          <button
            type="submit"
            disabled={clientLoginCount === 0}
            title={clientLoginCount === 0 ? "No client login found for this company" : undefined}
            className="rounded-btn bg-indigo-tint px-3 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-tint disabled:hover:text-indigo"
          >
            Email this report to client
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StatCard label="Attendance completion" value={`${report.attendancePct}%`} icon={Percent} size="large" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
          <StatCard label="Leave days taken" value={report.leaveDaysTaken} icon={CalendarDays} />
          <StatCard label="Reviews released" value={`${report.releasedReviews}/${report.totalReviews}`} icon={FileText} />
          <StatCard
            label="Concerns raised"
            value={`${report.concernsTotal} (${report.concernsReleased} shared)`}
            icon={AlertTriangle}
            tone={report.concernsTotal > 0 ? "orange" : "indigo"}
          />
        </div>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Masy notes for this month</h2>
        <form action={saveReportNotes} className="space-y-4">
          <input type="hidden" name="clientOrgId" value={selectedOrgId} />
          <input type="hidden" name="month" value={monthValue} />
          <textarea name="notes" rows={5} defaultValue={report.notes ?? ""} className={inputClass} />
          <button type="submit" className={buttonClass}>Save notes</button>
        </form>
      </div>
    </div>
  );
}
