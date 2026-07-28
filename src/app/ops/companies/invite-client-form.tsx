"use client";

import { useActionState, useState } from "react";
import { inviteClientUser, type InviteClientState } from "./actions";
import { inputClass } from "@/lib/form-styles";

export function InviteClientForm({ clientOrgId }: { clientOrgId: string }) {
  const action = inviteClientUser.bind(null, clientOrgId);
  const [state, formAction, isPending] = useActionState<InviteClientState, FormData>(action, undefined);
  const [showPassword, setShowPassword] = useState(false);

  if (state && "password" in state) {
    return (
      <div className="text-right">
        <p className="text-xs text-ink">{state.email}</p>
        <p className="text-xs text-indigo">{state.password}</p>
        <p className="text-xs text-slate-light">save this password now</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      {state && "error" in state && <span className="text-xs text-orange">{state.error}</span>}
      <div className="flex items-center gap-2">
        <input
          type="email"
          name="email"
          placeholder="founder@email.com"
          required
          className={`${inputClass} h-8 w-40 py-1 text-xs`}
        />
        {showPassword && (
          <input
            type="text"
            name="password"
            placeholder="Custom password"
            autoFocus
            className={`${inputClass} h-8 w-32 py-1 text-xs`}
          />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-btn bg-indigo px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-light disabled:opacity-50"
        >
          {isPending ? "…" : "Create login"}
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
