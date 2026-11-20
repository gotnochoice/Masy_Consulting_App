"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inputClass } from "@/lib/form-styles";
import type { ConvertToEmployeeState } from "@/app/ops/recruitment/actions";

type ConvertibleCandidate = {
  email: string | null;
  phone: string | null;
  location: string | null;
  convertedEmployeeId: string | null;
};

export function ConvertToEmployeeAction({
  candidate,
  roleTitle,
  action,
}: {
  candidate: ConvertibleCandidate;
  roleTitle: string;
  action: (prevState: ConvertToEmployeeState, formData: FormData) => Promise<ConvertToEmployeeState>;
}) {
  const [state, formAction, isPending] = useActionState<ConvertToEmployeeState, FormData>(action, undefined);

  const employeeId = candidate.convertedEmployeeId ?? (state && "employeeId" in state ? state.employeeId : null);
  if (employeeId) {
    return (
      <div className="mt-2">
        <Link
          href={`/ops/employees/${employeeId}/edit`}
          className="text-xs font-medium text-indigo hover:text-indigo-light"
        >
          {candidate.convertedEmployeeId ? "View employee record" : "✓ Employee record created"} →
        </Link>
      </div>
    );
  }

  if (!candidate.email) {
    return (
      <p className="mt-2 text-xs text-slate-light">Add an email to this candidate to create an employee record.</p>
    );
  }

  const todayValue = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="mt-2 space-y-1.5">
      <input type="hidden" name="roleTitle" value={roleTitle} />
      <input type="hidden" name="phone" value={candidate.phone ?? ""} />
      <input type="hidden" name="address" value={candidate.location ?? ""} />
      <div className="grid grid-cols-2 gap-1.5">
        <input
          type="date"
          name="startDate"
          defaultValue={todayValue}
          required
          className={`${inputClass} px-2 py-1 text-xs`}
        />
        <input
          type="email"
          name="email"
          defaultValue={candidate.email}
          required
          className={`${inputClass} px-2 py-1 text-xs`}
        />
      </div>
      {state && "error" in state && <p className="text-xs text-orange">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-medium text-indigo hover:text-indigo-light disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create employee record"}
      </button>
    </form>
  );
}
