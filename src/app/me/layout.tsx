import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await requireRole("EMPLOYEE");

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader
        roleLabel="Employee"
        nav={[
          { label: "Profile", href: "/me/profile" },
          { label: "Attendance", href: "/me/attendance" },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
