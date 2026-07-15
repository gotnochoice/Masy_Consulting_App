import { SignOutButton } from "@/components/sign-out-button";

export function DashboardHeader({ roleLabel }: { roleLabel: string }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
      <div>
        <p className="text-sm font-semibold text-neutral-900">Masy Consulting HR</p>
        <p className="text-xs text-neutral-500">{roleLabel}</p>
      </div>
      <SignOutButton />
    </header>
  );
}
