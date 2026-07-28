"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = personName.trim().charAt(0).toUpperCase() || "M";

  return (
    <header className="border-b border-border bg-paper shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-slate hover:bg-paper-2 hover:text-ink sm:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <MasyLogo className="text-base" />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-tint font-semibold text-indigo">
              {initial}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-ink">{personName}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-light">{roleLabel}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
      <nav className="hidden w-full items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:flex sm:justify-center sm:gap-3 sm:px-6 sm:py-3">
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
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
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

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 sm:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-border bg-paper px-3 py-4 shadow-sm transition-transform duration-200 sm:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-sm font-semibold text-ink">Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-btn text-slate hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <ul className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between rounded-btn px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-indigo text-white" : "text-slate hover:bg-paper-2 hover:text-ink"
                  }`}
                >
                  {item.label}
                  {!!item.badge && item.badge > 0 && (
                    <span
                      className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        active ? "bg-white text-indigo" : "bg-orange text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
