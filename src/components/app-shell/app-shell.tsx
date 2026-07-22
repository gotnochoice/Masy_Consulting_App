"use client";

import { useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Topbar userLabel={userLabel} onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar items={navItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto bg-paper-2 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
