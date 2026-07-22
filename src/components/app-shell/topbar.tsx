import { Menu, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";

export function Topbar({ userLabel, onMenuClick }: { userLabel: string; onMenuClick: () => void }) {
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
          <p className="font-mono text-[10px] uppercase tracking-wide text-slate-light">HR Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-8 items-center justify-center rounded-xl bg-indigo-tint text-indigo sm:flex">
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="hidden text-sm font-medium text-ink sm:inline">{userLabel}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
