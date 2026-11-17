"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitGuarantors, type SubmitGuarantorsState } from "./actions";

type GuarantorValues = {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  occupation: string;
  address: string;
};

const EMPTY: GuarantorValues = { name: "", relationship: "", phone: "", email: "", occupation: "", address: "" };

function GuarantorFields({
  prefix,
  defaults,
  consent,
  onConsentChange,
}: {
  prefix: "g1" | "g2";
  defaults: GuarantorValues;
  consent: boolean;
  onConsentChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-3 rounded-btn border border-border p-4">
      <p className="text-xs font-medium text-slate-light">{prefix === "g1" ? "First guarantor" : "Second guarantor"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`${prefix}_name`}>Full name</label>
          <input id={`${prefix}_name`} name={`${prefix}_name`} defaultValue={defaults.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${prefix}_relationship`}>Relationship to you</label>
          <input id={`${prefix}_relationship`} name={`${prefix}_relationship`} defaultValue={defaults.relationship} required className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`${prefix}_phone`}>Phone number</label>
          <input id={`${prefix}_phone`} name={`${prefix}_phone`} defaultValue={defaults.phone} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${prefix}_email`}>Email</label>
          <input id={`${prefix}_email`} name={`${prefix}_email`} type="email" defaultValue={defaults.email} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}_occupation`}>Occupation or employer (optional)</label>
        <input id={`${prefix}_occupation`} name={`${prefix}_occupation`} defaultValue={defaults.occupation} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${prefix}_address`}>Contact address</label>
        <textarea id={`${prefix}_address`} name={`${prefix}_address`} rows={2} defaultValue={defaults.address} required className={inputClass} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate">
        <input
          type="checkbox"
          name={`${prefix}_consent`}
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
          required
          className="mt-0.5"
        />
        This person knows I am giving their details and has agreed to be contacted.
      </label>
    </div>
  );
}

export function GuarantorsForm({
  guarantor1,
  guarantor2,
}: {
  guarantor1: GuarantorValues | null;
  guarantor2: GuarantorValues | null;
}) {
  const [state, formAction, isPending] = useActionState<SubmitGuarantorsState, FormData>(submitGuarantors, undefined);
  // Controlled, not uncontrolled defaultChecked, because the form below is submitted via
  // onSubmit + a manual dispatch rather than the native <form action={fn}> wiring -- see the
  // comment on the form element for why.
  const [g1Consent, setG1Consent] = useState(false);
  const [g2Consent, setG2Consent] = useState(false);

  return (
    <form
      // Deliberately NOT action={formAction}: React calls the native form.reset() once any
      // <form action={fn}> submission settles, success or failure -- wiping every field in the
      // whole form (not just uncontrolled ones), which silently threw away everything the user
      // had typed on a validation error. Dispatching manually through onSubmit sidesteps that
      // reset entirely, since React only applies it to its own native form-action integration.
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <p className="rounded-btn border border-border bg-paper-2 px-4 py-3 text-xs text-slate">
        Guarantors are verification contacts only -- they take no financial liability.
      </p>
      <GuarantorFields prefix="g1" defaults={guarantor1 ?? EMPTY} consent={g1Consent} onConsentChange={setG1Consent} />
      <GuarantorFields prefix="g2" defaults={guarantor2 ?? EMPTY} consent={g2Consent} onConsentChange={setG2Consent} />
      {state?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
