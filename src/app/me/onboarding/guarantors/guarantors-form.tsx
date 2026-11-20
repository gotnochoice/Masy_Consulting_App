"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
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
  label,
  defaults,
  consent,
  onConsentChange,
  consentLabel,
}: {
  prefix: "g1" | "g2";
  label: string;
  defaults: GuarantorValues;
  consent: boolean;
  onConsentChange: (checked: boolean) => void;
  consentLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-btn border border-border p-4">
      <p className="text-xs font-medium text-slate-light">{label}</p>
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
        {consentLabel}
      </label>
    </div>
  );
}

export function GuarantorsForm({
  guarantor1,
  guarantor2,
  required,
}: {
  guarantor1: GuarantorValues | null;
  guarantor2: GuarantorValues | null;
  required: 1 | 2;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<SubmitGuarantorsState, FormData>(
    async (prev, formData) => {
      const result = await submitGuarantors(prev, formData);
      // Navigating here, right as the dispatch resolves, rather than from a separate effect
      // watching isPending -- a server action's revalidatePath can refresh this route (and
      // swap this form out once the step shows SUBMITTED) before an effect-based check gets
      // a chance to run.
      // Guarantors is currently out of the compulsory onboarding sequence (see
      // ONBOARDING_STEP_ORDER), so there's no "next step" to route to -- back to the overview.
      if (!result) router.push("/me/onboarding");
      return result;
    },
    undefined,
  );
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
        {required === 1
          ? "Your next of kin is a verification contact only -- they take no financial liability."
          : "Guarantors are verification contacts only -- they take no financial liability."}
      </p>
      <GuarantorFields
        prefix="g1"
        label={required === 1 ? "Next of kin" : "First guarantor"}
        defaults={guarantor1 ?? EMPTY}
        consent={g1Consent}
        onConsentChange={setG1Consent}
        consentLabel={
          required === 1
            ? "This person knows I've listed them as my next of kin and has agreed to be contacted."
            : "This person knows I am giving their details and has agreed to be contacted."
        }
      />
      {required === 2 && (
        <GuarantorFields
          prefix="g2"
          label="Second guarantor"
          defaults={guarantor2 ?? EMPTY}
          consent={g2Consent}
          onConsentChange={setG2Consent}
          consentLabel="This person knows I am giving their details and has agreed to be contacted."
        />
      )}
      {state?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
