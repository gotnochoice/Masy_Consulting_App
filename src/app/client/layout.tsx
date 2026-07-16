import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireRole("CLIENT");

  return (
    <div className="min-h-screen bg-paper-2">
      <DashboardHeader
        roleLabel="Client"
        nav={[
          { label: "Staff", href: "/client/staff" },
          { label: "Attendance", href: "/client/attendance" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
