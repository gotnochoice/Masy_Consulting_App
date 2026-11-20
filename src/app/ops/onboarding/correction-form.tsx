"use client";

import { useActionState } from "react";
import { inputClass } from "@/lib/form-styles";
import { requestStepCorrection, type RequestCorrectionState } from "./actions";

export function CorrectionForm({ stepId }: { stepId: string }) {
  const action = requestStepCorrection.bind(null, stepId);
  const [state, formAction, isPending] = useActionState<RequestCorrectionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input name="reason" placeholder="What needs to change?" required className={`${inputClass} text-xs`} />
      <button type="submit" disabled={isPending} className="shrink-0 whitespace-nowrap text-xs font-medium text-orange hover:text-orange/80 disabled:opacity-50">
        {isPending ? "Sending…" : "Needs correction"}
      </button>
      {state?.error && <p className="text-xs text-orange">{state.error}</p>}
    </form>
  );
}
