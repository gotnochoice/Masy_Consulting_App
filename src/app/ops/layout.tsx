import { requireRole } from "@/lib/rbac";
import { getOpsInboxItems } from "@/lib/ops-inbox";
import { AppShell } from "@/components/app-shell/app-shell";
import type { NavItem } from "@/components/app-shell/sidebar";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("MASY_OPS");

  const inbox = await getOpsInboxItems();
  const countFor = (href: string) => inbox.find((item) => item.href === href)?.count ?? 0;

  const navItems: NavItem[] = [
    { label: "Overview", href: "/ops/overview", icon: "overview" },
    { label: "Companies", href: "/ops/companies", icon: "companies" },
    { label: "Employees", href: "/ops/employees", icon: "employees" },
    { label: "Onboarding", href: "/ops/onboarding", icon: "onboarding" },
    { label: "Attendance", href: "/ops/attendance", icon: "attendance" },
    { label: "Leave", href: "/ops/leave", icon: "leave", badge: countFor("/ops/leave") },
    { label: "Reviews", href: "/ops/reviews", icon: "reviews", badge: countFor("/ops/reviews") },
    { label: "Pulse", href: "/ops/pulse", icon: "pulse" },
    { label: "Recruitment", href: "/ops/recruitment", icon: "recruitment", badge: countFor("/ops/recruitment") },
    { label: "Concerns", href: "/ops/concerns", icon: "concerns", badge: countFor("/ops/concerns") },
    { label: "Documents", href: "/ops/documents", icon: "documents", badge: countFor("/ops/documents") },
    { label: "Announcements", href: "/ops/announcements", icon: "announcements" },
    { label: "Reports", href: "/ops/reports", icon: "reports" },
  ];

  return (
    <AppShell userLabel="Masy" navItems={navItems} inbox={inbox}>
      {children}
    </AppShell>
  );
}
