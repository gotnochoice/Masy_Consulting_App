"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";

type NavItem = { label: string; href: string; badge?: number };

export function DashboardHeader({
  roleLabel,
  personName,
  nav,
}: {
  roleLabel: string;
  personName: string;
  nav: NavItem[];
}) {
  const pathname = usePathname();
  const initial = personName.trim().charAt(0).toUpperCase() || "M";

  return (
    <header className="border-b border-border bg-paper shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <MasyLogo className="text-base" />
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-tint font-semibold text-indigo">
              {initial}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-ink">{personName}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-slate-light">{roleLabel}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
      <nav className="flex w-full items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:justify-center sm:gap-3 sm:px-6 sm:py-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-btn px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-indigo text-white" : "text-slate hover:bg-indigo-tint hover:text-indigo"
              }`}
            >
              {item.label}
              {!!item.badge && item.badge > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold ${
                    active ? "bg-white text-indigo" : "bg-orange text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
