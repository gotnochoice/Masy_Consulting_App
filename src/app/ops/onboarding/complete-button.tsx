"use client";

import { useActionState } from "react";
import { completeOnboarding, type CompleteOnboardingState } from "./actions";

export function CompleteButton({ employeeId }: { employeeId: string }) {
  const action = completeOnboarding.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<CompleteOnboardingState, FormData>(
    async (_prev) => action(),
    undefined,
  );

  return (
    <form action={formAction} className="space-y-1">
      <button type="submit" disabled={isPending} className="rounded-btn bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-light disabled:opacity-50">
        {isPending ? "Checking…" : "Mark onboarding complete"}
      </button>
      {state?.error && <p className="text-xs text-orange">{state.error}</p>}
    </form>
  );
}
