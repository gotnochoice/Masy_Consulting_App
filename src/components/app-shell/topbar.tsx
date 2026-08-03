"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Menu, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";
import type { OpsInboxItem } from "@/lib/ops-inbox";

export function Topbar({
  userLabel,
  onMenuClick,
  inbox = [],
}: {
  userLabel: string;
  onMenuClick: () => void;
  inbox?: OpsInboxItem[];
}) {
  const [bellOpen, setBellOpen] = useState(false);
  const items = inbox.filter((item) => item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-paper shadow-sm px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-btn text-slate hover:bg-paper-2 hover:text-ink lg:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div>
          <MasyLogo className="text-base" />
          <p className="text-[10px] uppercase tracking-wide text-slate-light">HR Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setBellOpen((v) => !v)}
            aria-label="Notifications"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-btn text-slate hover:bg-paper-2 hover:text-ink"
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
            {total > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange" />}
          </button>
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[90vw] rounded-card border border-border bg-paper shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-ink">Needs your attention</p>
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setBellOpen(false)}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper-2"
                    >
                      <span className="text-sm text-ink">{item.label}</span>
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange px-1.5 text-xs font-semibold text-white">
                        {item.count}
                      </span>
                    </Link>
                  ))}
                  {items.length === 0 && (
                    <p className="px-4 py-6 text-center text-xs text-slate-light">You&rsquo;re all caught up.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="hidden h-8 w-8 items-center justify-center rounded-xl bg-indigo-tint text-indigo sm:flex">
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="hidden text-sm font-medium text-ink sm:inline">{userLabel}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
