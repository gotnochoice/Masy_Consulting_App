import Link from "next/link";
import { Percent, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getMonthlyReportData, getStaffReportRows, monthLabelFor } from "@/lib/monthly-report";
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

  const [report, staffRows] = await Promise.all([
    getMonthlyReportData(session.user.clientOrgId ?? "__none__", monthValue),
    getStaffReportRows(session.user.clientOrgId ?? "__none__", monthValue),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Reports</h1>
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

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Notes from your Masy HR contact</h2>
        <p className="text-sm text-slate">{report.notes ?? "No notes published for this month yet."}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink">By staff member, {monthLabelFor(monthValue)}</h2>
        <div className="overflow-x-auto rounded-card border border-border bg-paper">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-indigo-tint">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">
                  Attendance
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">
                  Leave days
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-indigo">
                  Latest review
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffRows.map((row) => (
                <tr key={row.employeeId}>
                  <td className="px-4 py-2.5 font-medium text-ink">{row.name}</td>
                  <td className="px-4 py-2.5 text-slate">{row.roleTitle}</td>
                  <td className="px-4 py-2.5 text-slate">{row.attendancePct}%</td>
                  <td className="px-4 py-2.5 text-slate">{row.leaveDaysTaken}</td>
                  <td className="px-4 py-2.5 text-slate">
                    {row.latestReleasedReviewId ? (
                      <Link
                        href={`/client/reviews#review-${row.latestReleasedReviewId}`}
                        className="font-medium text-indigo hover:text-indigo-light"
                      >
                        Read review{row.reviewsReleased > 1 ? ` (${row.reviewsReleased})` : ""}
                      </Link>
                    ) : (
                      <span className="text-slate-light">None yet</span>
                    )}
                  </td>
                </tr>
              ))}
              {staffRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-light">
                    No staff on record yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
