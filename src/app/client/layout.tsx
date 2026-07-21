import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CLIENT");

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader
        roleLabel="Client"
        nav={[
          { label: "Staff", href: "/client/staff" },
          { label: "Attendance", href: "/client/attendance" },
          { label: "Leave", href: "/client/leave" },
          { label: "Reviews", href: "/client/reviews" },
          { label: "Pulse", href: "/client/pulse" },
          { label: "Concerns", href: "/client/concerns" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
