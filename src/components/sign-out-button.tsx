import { logoutAction } from "@/lib/actions/logout";

export function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
        Sign out
      </button>
    </form>
  );
}
