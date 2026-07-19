"use client";

import { useActionState } from "react";
import { inviteEmployeeUser, type InviteEmployeeState } from "./actions";

export function InviteEmployeeForm({ employeeId }: { employeeId: string }) {
  const action = inviteEmployeeUser.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<InviteEmployeeState, FormData>(action, undefined);

  if (state && "password" in state) {
    return (
      <div className="text-right">
        <p className="font-mono text-xs text-indigo">{state.password}</p>
        <p className="text-xs text-slate-light">password — save now</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="text-right">
      <button
        type="submit"
        disabled={isPending}
        className="text-sm font-medium text-indigo hover:text-indigo-light disabled:opacity-50"
      >
        {isPending ? "…" : "Invite"}
      </button>
      {state && "error" in state && <p className="text-xs text-orange">{state.error}</p>}
    </form>
  );
}
