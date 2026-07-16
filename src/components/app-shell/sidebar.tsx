"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Clock } from "lucide-react";

const ICONS = {
  overview: LayoutGrid,
  employees: Users,
  attendance: Clock,
} as const;

export type NavIconName = keyof typeof ICONS;
export type NavItem = { label: string; href: string; icon: NavIconName };

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="w-60 shrink-0 overflow-y-auto border-r border-border bg-paper px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-indigo text-white" : "text-slate hover:bg-paper-2 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
