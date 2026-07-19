"use client";

import { useActionState } from "react";
import { inviteClientUser, type InviteClientState } from "./actions";
import { inputClass } from "@/lib/form-styles";

export function InviteClientForm({ clientOrgId }: { clientOrgId: string }) {
  const action = inviteClientUser.bind(null, clientOrgId);
  const [state, formAction, isPending] = useActionState<InviteClientState, FormData>(action, undefined);

  if (state && "password" in state) {
    return (
      <div className="text-right">
        <p className="text-xs text-ink">{state.email}</p>
        <p className="font-mono text-xs text-indigo">{state.password}</p>
        <p className="text-xs text-slate-light">save this password now</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      {state && "error" in state && <span className="text-xs text-orange">{state.error}</span>}
      <input
        type="email"
        name="email"
        placeholder="founder@email.com"
        required
        className={`${inputClass} h-8 w-40 py-1 text-xs`}
      />
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-btn bg-indigo px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-light disabled:opacity-50"
      >
        {isPending ? "…" : "Create login"}
      </button>
    </form>
  );
}
