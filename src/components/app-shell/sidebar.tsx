"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Clock,
  Building2,
  CalendarDays,
  FileText,
  Briefcase,
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Activity,
  X,
} from "lucide-react";

const ICONS = {
  overview: LayoutGrid,
  companies: Building2,
  employees: Users,
  attendance: Clock,
  leave: CalendarDays,
  reviews: FileText,
  recruitment: Briefcase,
  concerns: AlertTriangle,
  reports: BarChart3,
  onboarding: ClipboardCheck,
  pulse: Activity,
} as const;

export type NavIconName = keyof typeof ICONS;
export type NavItem = { label: string; href: string; icon: NavIconName };

export function Sidebar({ items, open, onClose }: { items: NavItem[]; open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-border bg-paper px-3 py-4 shadow-sm transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold text-ink">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-btn text-slate hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
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
    </>
  );
}
