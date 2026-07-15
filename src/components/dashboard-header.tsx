import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = { label: string; href: string };

export function DashboardHeader({ roleLabel, nav }: { roleLabel: string; nav: NavItem[] }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
      <div className="flex items-center gap-8">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Masy Consulting HR</p>
          <p className="text-xs text-neutral-500">{roleLabel}</p>
        </div>
        <nav className="flex gap-4">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-neutral-600 hover:text-neutral-900">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <SignOutButton />
    </header>
  );
}
