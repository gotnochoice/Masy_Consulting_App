import { User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export function Topbar({ userLabel }: { userLabel: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-paper shadow-sm px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-sm font-bold text-white">
          M
        </div>
        <span className="text-base font-bold text-indigo">Masy Consulting HR</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-tint text-indigo">
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="text-sm font-medium text-ink">{userLabel}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
