"use client";

import { useActionState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { LetterheadState } from "./actions";

type OrgLetterhead = {
  logoUrl: string | null;
  companyLegalName: string | null;
  companyAddress: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  onboardingCountersignerRole: "FOUNDER_OR_CLIENT_ADMIN" | "HR_MASY";
};

export function LetterheadForm({
  org,
  action,
}: {
  org: OrgLetterhead;
  action: (state: LetterheadState, formData: FormData) => Promise<LetterheadState>;
}) {
  const [state, formAction, isPending] = useActionState<LetterheadState, FormData>(action, undefined);

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Letterhead</h2>
        <p className="text-xs text-slate-light">
          Used on every employment agreement and offer letter generated for your staff.
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="flex items-center gap-4">
          {org.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="Current logo" className="h-12 w-12 rounded-btn border border-border object-contain" />
          )}
          <div className="flex-1">
            <label className={labelClass} htmlFor="logo">Logo</label>
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="companyLegalName">Registered company name</label>
          <input id="companyLegalName" name="companyLegalName" defaultValue={org.companyLegalName ?? ""} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="companyAddress">Company address</label>
          <textarea id="companyAddress" name="companyAddress" defaultValue={org.companyAddress ?? ""} required rows={2} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="signatoryName">Signatory name</label>
            <input id="signatoryName" name="signatoryName" defaultValue={org.signatoryName ?? ""} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="signatoryTitle">Signatory title</label>
            <input id="signatoryTitle" name="signatoryTitle" defaultValue={org.signatoryTitle ?? ""} required placeholder="Founder, HR Manager, etc." className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="onboardingCountersignerRole">Who countersigns new hires&rsquo; agreements?</label>
          <select id="onboardingCountersignerRole" name="onboardingCountersignerRole" defaultValue={org.onboardingCountersignerRole} className={inputClass}>
            <option value="FOUNDER_OR_CLIENT_ADMIN">Me (the signatory above)</option>
            <option value="HR_MASY">Masy HR, on our behalf</option>
          </select>
        </div>
        {state && "error" in state && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
        )}
        <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
          {isPending ? "Saving…" : "Save letterhead"}
        </button>
      </form>
    </div>
  );
}
