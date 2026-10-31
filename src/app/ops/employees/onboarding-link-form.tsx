"use client";

import { useActionState } from "react";
import { generateOnboardingLink, type OnboardingLinkState } from "./actions";
import { CopyLinkButton } from "@/components/copy-link-button";

export function OnboardingLinkForm({ employeeId }: { employeeId: string }) {
  const action = generateOnboardingLink.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<OnboardingLinkState, FormData>(action, undefined);

  if (state && "link" in state) {
    return (
      <div className="flex flex-col items-end gap-1">
        <CopyLinkButton link={state.link} />
        <p className="text-[11px] text-slate-light">Share this with them, one-time use.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      {state && "error" in state && <span className="text-xs text-orange">{state.error}</span>}
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink disabled:opacity-50"
      >
        {isPending ? "…" : "Onboarding link"}
      </button>
    </form>
  );
}
