import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/logout";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate transition-colors hover:bg-paper-2 hover:text-ink"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );
}
