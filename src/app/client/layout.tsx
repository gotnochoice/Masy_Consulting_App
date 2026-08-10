import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getUnreadAnnouncements } from "@/lib/announcements";
import { getUnresolvedConcernsForClient } from "@/lib/concerns";
import { getUnresolvedReviewsForClient } from "@/lib/reviews";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CLIENT");

  const [org, pendingLeaveCount, unread, unresolvedConcerns, unresolvedReviews] = await Promise.all([
    session.user.clientOrgId
      ? db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } })
      : null,
    db.leaveRequest.count({ where: { employee: scopedEmployeeWhere(session), status: "PENDING" } }),
    getUnreadAnnouncements(session.user.id, session.user.clientOrgId),
    getUnresolvedConcernsForClient(session),
    getUnresolvedReviewsForClient(session),
  ]);

  return (
    <div className="min-h-screen bg-paper-2">
      <DashboardHeader
        roleLabel="Client"
        personName={org?.name ?? "Client"}
        unreadAnnouncements={unread.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          authorLabel: a.authorLabel,
          createdAt: a.createdAt.toLocaleDateString(),
        }))}
        unresolvedConcerns={unresolvedConcerns.map((c) => ({
          id: c.id,
          summary: c.curatedSummary ?? "",
          updatedAt: c.updatedAt.toLocaleDateString(),
        }))}
        unresolvedReviews={unresolvedReviews.map((r) => ({
          id: r.id,
          employeeName: r.employee.name,
          cycle: r.cycle,
        }))}
        pendingLeave={{ count: pendingLeaveCount, href: "/client/leave" }}
        nav={[
          { label: "Overview", href: "/client/staff" },
          { label: "Attendance", href: "/client/attendance" },
          { label: "Leave", href: "/client/leave", badge: pendingLeaveCount },
          { label: "Reviews", href: "/client/reviews", badge: unresolvedReviews.length },
          { label: "Recruitment", href: "/client/recruitment" },
          { label: "Pulse", href: "/client/pulse" },
          { label: "Concerns", href: "/client/concerns", badge: unresolvedConcerns.length },
          { label: "Announcements", href: "/client/announcements", badge: unread.length },
          { label: "Reports", href: "/client/reports" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
