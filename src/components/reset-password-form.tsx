"use client";

import { useActionState } from "react";
import { resetUserPassword, type ResetPasswordState } from "@/lib/actions/reset-password";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const action = resetUserPassword.bind(null, userId);
  const [state, formAction, isPending] = useActionState<ResetPasswordState, FormData>(action, undefined);

  if (state && "password" in state) {
    return (
      <div className="text-right">
        <p className="font-mono text-xs text-indigo">{state.password}</p>
        <p className="text-xs text-slate-light">new password — save now</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="text-right">
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-medium text-slate hover:text-orange disabled:opacity-50"
      >
        {isPending ? "…" : "Reset password"}
      </button>
      {state && "error" in state && <p className="text-xs text-orange">{state.error}</p>}
    </form>
  );
}
