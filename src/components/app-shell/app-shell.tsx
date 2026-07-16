import { Topbar } from "@/components/app-shell/topbar";
import { Sidebar, type NavItem } from "@/components/app-shell/sidebar";

export function AppShell({
  userLabel,
  navItems,
  children,
}: {
  userLabel: string;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <Topbar userLabel={userLabel} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} />
        <main className="flex-1 overflow-y-auto bg-paper-2 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
