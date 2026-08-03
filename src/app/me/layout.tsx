import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getUnreadAnnouncements } from "@/lib/announcements";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("EMPLOYEE");

  const employee = session.user.employeeId
    ? await db.employee.findUnique({ where: { id: session.user.employeeId }, select: { name: true } })
    : null;

  const unread = await getUnreadAnnouncements(session.user.id, session.user.clientOrgId);

  return (
    <div className="min-h-screen bg-paper-2">
      <DashboardHeader
        roleLabel="Staff"
        personName={employee?.name ?? "Team member"}
        unreadAnnouncements={unread.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          authorLabel: a.authorLabel,
          createdAt: a.createdAt.toLocaleDateString(),
        }))}
        nav={[
          { label: "Home", href: "/me/profile" },
          { label: "Attendance", href: "/me/attendance" },
          { label: "Leave", href: "/me/leave" },
          { label: "Reviews", href: "/me/reviews" },
          { label: "Pulse", href: "/me/pulse" },
          { label: "Concerns", href: "/me/concerns" },
          { label: "Documents", href: "/me/documents" },
          { label: "Announcements", href: "/me/announcements", badge: unread.length },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
