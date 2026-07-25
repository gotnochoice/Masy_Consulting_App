"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";

type NavItem = { label: string; href: string };

export function DashboardHeader({ roleLabel, nav }: { roleLabel: string; nav: NavItem[] }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-paper shadow-sm">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start">
          <div>
            <MasyLogo className="text-base" />
            <p className="font-mono text-xs text-slate-light">{roleLabel}</p>
          </div>
          <div className="sm:hidden">
            <SignOutButton />
          </div>
        </div>
        <div className="hidden sm:block">
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
              className={`shrink-0 rounded-btn px-4 py-2 text-sm font-medium transition-colors ${
                active ? "bg-indigo text-white" : "text-slate hover:bg-indigo-tint hover:text-indigo"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
