import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getUnreadAnnouncements } from "@/lib/announcements";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CLIENT");

  const [org, pendingLeaveCount, unread] = await Promise.all([
    session.user.clientOrgId
      ? db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } })
      : null,
    db.leaveRequest.count({ where: { employee: scopedEmployeeWhere(session), status: "PENDING" } }),
    getUnreadAnnouncements(session.user.id, session.user.clientOrgId),
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
        nav={[
          { label: "Overview", href: "/client/staff" },
          { label: "Attendance", href: "/client/attendance" },
          { label: "Leave", href: "/client/leave", badge: pendingLeaveCount },
          { label: "Reviews", href: "/client/reviews" },
          { label: "Pulse", href: "/client/pulse" },
          { label: "Concerns", href: "/client/concerns" },
          { label: "Announcements", href: "/client/announcements", badge: unread.length },
          { label: "Reports", href: "/client/reports" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
