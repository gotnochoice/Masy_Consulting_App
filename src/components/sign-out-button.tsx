import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/logout";

export function SignOutButton({ light = false }: { light?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          light ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-indigo/70 hover:bg-paper hover:text-indigo"
        }`}
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );
}
