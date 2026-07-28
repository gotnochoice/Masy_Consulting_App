"use client";

import { useActionState, useState } from "react";
import { inviteEmployeeUser, type InviteEmployeeState } from "./actions";

export function InviteEmployeeForm({ employeeId }: { employeeId: string }) {
  const action = inviteEmployeeUser.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<InviteEmployeeState, FormData>(action, undefined);
  const [showPassword, setShowPassword] = useState(false);

  if (state && "password" in state) {
    return (
      <div className="text-right">
        <p className="font-mono text-xs text-indigo">{state.password}</p>
        <p className="text-xs text-slate-light">password, save now</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      {state && "error" in state && <span className="text-xs text-orange">{state.error}</span>}
      <div className="flex items-center gap-2">
        {showPassword && (
          <input
            type="text"
            name="password"
            placeholder="Custom password"
            autoFocus
            className="h-8 w-36 rounded-btn border border-border px-2.5 py-1 text-xs"
          />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-btn bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-light disabled:opacity-50"
        >
          {isPending ? "…" : "Invite"}
        </button>
      </div>
      {!showPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="text-[11px] font-medium text-slate-light hover:text-indigo"
        >
          Set custom password
        </button>
      )}
    </form>
  );
}
