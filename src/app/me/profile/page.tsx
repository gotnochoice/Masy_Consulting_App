import { Clock, CalendarDays, Award } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { todayDateOnly } from "@/lib/attendance";
import { formatDateShort } from "@/lib/leave";
import { upcomingMilestones } from "@/lib/milestones";
import { formatTenure } from "@/lib/tenure";
import { StatusBadge } from "@/components/status-badge";
import { LeaveStatusBadge } from "@/components/leave-status-badge";
import { StatCard } from "@/components/stat-card";
import { MilestonesPanel } from "@/components/milestones-panel";
import { SuccessBanner } from "@/components/success-banner";

export default async function MyProfilePage() {
  const session = await requireRole("EMPLOYEE");

  const employee = session.user.employeeId
    ? await db.employee.findUnique({
        where: { id: session.user.employeeId },
        include: { clientOrg: true },
      })
    : null;

  if (!employee) {
    return (
      <p className="text-sm text-slate">
        No profile found yet. Contact your Masy HR contact.
      </p>
    );
  }

  const [todayRecord, recentLeave, teammates] = await Promise.all([
    db.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: todayDateOnly() } },
    }),
    db.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.employee.findMany({
      where: { clientOrgId: employee.clientOrgId, status: "ACTIVE" },
      include: { clientOrg: true },
    }),
  ]);

  const milestones = upcomingMilestones(teammates);

  const todayStatus = !todayRecord ? "Not yet" : todayRecord.clockOut ? "Done for today" : "Clocked in";

  const firstName = employee.name.split(" ")[0];
  const today = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo">{today}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-slate">{employee.roleTitle} at {employee.clientOrg.name}</p>
      </div>

      <SuccessBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={todayStatus} icon={Clock} />
        <StatCard label="Leave balance" value={`${employee.leaveBalanceDays} days`} icon={CalendarDays} />
        <StatCard label="With the team" value={formatTenure(employee.startDate)} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-paper p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Your details</h2>
            <a href="/me/profile/edit" className="text-xs font-medium text-indigo hover:text-indigo-light">
              Edit
            </a>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Role</dt>
              <dd className="text-right font-medium text-ink">{employee.roleTitle}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Organization</dt>
              <dd className="text-right font-medium text-ink">{employee.clientOrg.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Status</dt>
              <dd><StatusBadge status={employee.status} /></dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Start date</dt>
              <dd className="text-xs text-ink">{employee.startDate.toLocaleDateString()}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Email</dt>
              <dd className="text-right text-xs text-ink">{employee.email}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Phone</dt>
              <dd className="text-right text-xs text-ink">{employee.phone || "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Date of birth</dt>
              <dd className="text-right text-xs text-ink">
                {employee.dateOfBirth ? employee.dateOfBirth.toLocaleDateString() : "—"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Address</dt>
              <dd className="text-right text-xs text-ink">{employee.address || "—"}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-slate">Emergency contact</dt>
              <dd className="text-right text-xs text-ink">
                {employee.emergencyContactName
                  ? `${employee.emergencyContactName}${employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ""}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-card border border-border bg-paper p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Recent leave requests</h2>
          {recentLeave.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {recentLeave.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize text-ink">{r.type.toLowerCase()} leave</p>
                    <p className="text-xs text-slate-light">
                      {formatDateShort(r.startDate)} to {formatDateShort(r.endDate)}
                    </p>
                  </div>
                  <LeaveStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-light">No leave requests yet.</p>
          )}
        </div>
      </div>

      <MilestonesPanel milestones={milestones} />
    </div>
  );
}
