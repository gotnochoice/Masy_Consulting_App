import { requireRole } from "@/lib/rbac";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await requireRole("EMPLOYEE");

  return (
    <div className="min-h-screen bg-paper-2">
      <DashboardHeader
        roleLabel="Employee"
        nav={[
          { label: "Profile", href: "/me/profile" },
          { label: "Attendance", href: "/me/attendance" },
          { label: "Leave", href: "/me/leave" },
          { label: "Reviews", href: "/me/reviews" },
          { label: "Concerns", href: "/me/concerns" },
        ]}
      />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
