import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("CLIENT");

  const [org, pendingLeaveCount] = await Promise.all([
    session.user.clientOrgId
      ? db.clientOrg.findUnique({ where: { id: session.user.clientOrgId }, select: { name: true } })
      : null,
    db.leaveRequest.count({ where: { employee: scopedEmployeeWhere(session), status: "PENDING" } }),
  ]);

  return (
    <div className="min-h-screen bg-paper-2">
      <DashboardHeader
        roleLabel="Client"
        personName={org?.name ?? "Client"}
        nav={[
          { label: "Overview", href: "/client/staff" },
          { label: "Attendance", href: "/client/attendance" },
          { label: "Leave", href: "/client/leave", badge: pendingLeaveCount },
          { label: "Reviews", href: "/client/reviews" },
          { label: "Pulse", href: "/client/pulse" },
          { label: "Concerns", href: "/client/concerns" },
          { label: "Reports", href: "/client/reports" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
