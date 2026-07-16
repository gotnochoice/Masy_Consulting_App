import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app-shell/app-shell";
import type { NavItem } from "@/components/app-shell/sidebar";

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/ops/overview", icon: "overview" },
  { label: "Companies", href: "/ops/companies", icon: "companies" },
  { label: "Employees", href: "/ops/employees", icon: "employees" },
  { label: "Attendance", href: "/ops/attendance", icon: "attendance" },
  { label: "Leave", href: "/ops/leave", icon: "leave" },
  { label: "Reviews", href: "/ops/reviews", icon: "reviews" },
  { label: "Recruitment", href: "/ops/recruitment", icon: "recruitment" },
  { label: "Concerns", href: "/ops/concerns", icon: "concerns" },
  { label: "Reports", href: "/ops/reports", icon: "reports" },
];

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MASY_OPS");

  return (
    <AppShell userLabel="Masy" navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
