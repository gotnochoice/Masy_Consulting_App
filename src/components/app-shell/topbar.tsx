import { Menu, User } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { MasyLogo } from "@/components/masy-logo";

export function Topbar({ userLabel, onMenuClick }: { userLabel: string; onMenuClick: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between bg-indigo px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-btn text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div>
          <MasyLogo className="text-base" light />
          <p className="font-mono text-[10px] uppercase tracking-wide text-white/50">HR Platform</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white sm:flex">
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="hidden text-sm font-medium text-white sm:inline">{userLabel}</span>
        <SignOutButton light />
      </div>
    </header>
  );
}
