import { Percent, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { leaveDaysBetween } from "@/lib/leave";
import { StatCard } from "@/components/stat-card";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { saveReportNotes } from "./actions";

function monthLabel(monthValue: string) {
  const [year, monthNum] = monthValue.split("-").map(Number);
  return new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString([], { year: "numeric", month: "long" });
}

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
  const [year, monthNum] = monthValue.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNum, 1));

  if (!selectedOrgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-ink">Reports</h1>
        <p className="text-sm text-slate">Add a company before you can put together a report.</p>
      </div>
    );
  }

  const [attendanceRecords, leaveRequests, reviews, concernsTotal, concernsReleased, existingNote] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { employee: { clientOrgId: selectedOrgId }, date: { gte: monthStart, lt: monthEnd } },
    }),
    db.leaveRequest.findMany({
      where: {
        employee: { clientOrgId: selectedOrgId },
        status: "APPROVED",
        startDate: { lt: monthEnd },
        endDate: { gte: monthStart },
      },
    }),
    db.performanceReview.findMany({ where: { employee: { clientOrgId: selectedOrgId } } }),
    db.concern.count({ where: { employee: { clientOrgId: selectedOrgId }, createdAt: { gte: monthStart, lt: monthEnd } } }),
    db.concern.count({
      where: {
        employee: { clientOrgId: selectedOrgId },
        createdAt: { gte: monthStart, lt: monthEnd },
        visibility: "CLIENT_VISIBLE",
      },
    }),
    db.monthlyReportNote.findUnique({
      where: { clientOrgId_month: { clientOrgId: selectedOrgId, month: monthStart } },
    }),
  ]);

  const completedDays = attendanceRecords.filter((r) => r.clockOut).length;
  const attendancePct = attendanceRecords.length > 0 ? Math.round((completedDays / attendanceRecords.length) * 100) : 0;
  const leaveDaysTaken = leaveRequests.reduce((sum, r) => sum + leaveDaysBetween(r.startDate, r.endDate), 0);
  const releasedReviews = reviews.filter((r) => r.status === "RELEASED").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Reports</h1>
        <p className="text-sm text-slate">One shared template — what actually gets sent to each client.</p>
      </div>

      <form method="get" className="flex items-end gap-4">
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

      <p className="text-sm text-slate">{monthLabel(monthValue)}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StatCard label="Attendance completion" value={`${attendancePct}%`} icon={Percent} size="large" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-3">
          <StatCard label="Leave days taken" value={leaveDaysTaken} icon={CalendarDays} />
          <StatCard label="Reviews released" value={`${releasedReviews}/${reviews.length}`} icon={FileText} />
          <StatCard
            label="Concerns raised"
            value={`${concernsTotal} (${concernsReleased} shared)`}
            icon={AlertTriangle}
            tone={concernsTotal > 0 ? "orange" : "indigo"}
          />
        </div>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Masy notes for this month</h2>
        <form action={saveReportNotes} className="space-y-4">
          <input type="hidden" name="clientOrgId" value={selectedOrgId} />
          <input type="hidden" name="month" value={monthValue} />
          <textarea name="notes" rows={5} defaultValue={existingNote?.notes ?? ""} className={inputClass} />
          <button type="submit" className={buttonClass}>Save notes</button>
        </form>
      </div>
    </div>
  );
}
