import { Percent, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getMonthlyReportData, monthLabelFor } from "@/lib/monthly-report";
import { StatCard } from "@/components/stat-card";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";

export default async function ClientReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireRole("CLIENT");
  const { month } = await searchParams;

  const now = new Date();
  const monthValue = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const report = await getMonthlyReportData(session.user.clientOrgId ?? "__none__", monthValue);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Reports</h1>
        <p className="text-sm text-slate">Your monthly summary from Masy Consulting.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass} htmlFor="month">Month</label>
          <input id="month" name="month" type="month" defaultValue={monthValue} className={inputClass} />
        </div>
        <button type="submit" className={buttonClass}>View</button>
      </form>

      <p className="text-sm text-slate">{monthLabelFor(monthValue)}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StatCard label="Attendance completion" value={`${report.attendancePct}%`} icon={Percent} size="large" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
          <StatCard label="Leave days taken" value={report.leaveDaysTaken} icon={CalendarDays} />
          <StatCard label="Reviews released" value={`${report.releasedReviews}/${report.totalReviews}`} icon={FileText} />
          <StatCard
            label="Concerns shared"
            value={report.concernsReleased}
            icon={AlertTriangle}
            tone={report.concernsReleased > 0 ? "orange" : "indigo"}
          />
        </div>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Notes from your Masy HR contact</h2>
        <p className="text-sm text-slate">{report.notes ?? "No notes published for this month yet."}</p>
      </div>
    </div>
  );
}
