import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = { label: string; href: string };

export function DashboardHeader({ roleLabel, nav }: { roleLabel: string; nav: NavItem[] }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-paper shadow-sm px-6 py-4">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-sm font-bold text-white">
            M
          </div>
          <div>
            <p className="text-sm font-bold text-indigo">Masy Consulting HR</p>
            <p className="font-mono text-xs text-slate-light">{roleLabel}</p>
          </div>
        </div>
        <nav className="flex gap-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-btn px-3 py-1.5 text-sm font-medium text-slate transition-colors hover:bg-indigo-tint hover:text-indigo"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <SignOutButton />
    </header>
  );
}
