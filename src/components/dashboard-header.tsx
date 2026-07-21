import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";

type NavItem = { label: string; href: string };

export function DashboardHeader({ roleLabel, nav }: { roleLabel: string; nav: NavItem[] }) {
  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-indigo-tint px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-start">
        <div>
          <MasyLogo className="text-base" />
          <p className="font-mono text-xs text-indigo/60">{roleLabel}</p>
        </div>
        <div className="sm:hidden">
          <SignOutButton />
        </div>
      </div>
      <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-btn px-3 py-1.5 text-sm font-medium text-indigo/70 transition-colors hover:bg-paper hover:text-indigo"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="hidden sm:block">
        <SignOutButton />
      </div>
    </header>
  );
}
