"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { BankFields } from "./bank-fields";
import { submitPersonalDetails, saveDraft, verifyBankAccount, type SubmitPersonalDetailsState, type SaveDraftState, type VerifyBankState } from "./actions";
import type { NigerianBank } from "@/lib/bank-verification";
import { nextOnboardingStepPath } from "@/lib/onboarding";

type EmployeeFields = {
  name: string;
  preferredName: string | null;
  dateOfBirth: string;
  phone: string | null;
  whatsappNumber: string | null;
  personalEmail: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  roleTitle: string;
  clientOrgName: string;
  shiftLabel: string | null;
  shiftDescription: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankAccountHolderName: string | null;
};

export function PersonalDetailsForm({
  employee,
  banks,
  banksError,
}: {
  employee: EmployeeFields;
  banks: NigerianBank[];
  banksError: string | null;
}) {
  const router = useRouter();
  const [submitState, submitAction, isSubmitting] = useActionState<SubmitPersonalDetailsState, FormData>(
    async (prev, formData) => {
      const result = await submitPersonalDetails(prev, formData);
      // Navigating here, right as the dispatch resolves, rather than from a separate effect
      // watching isSubmitting -- a server action's revalidatePath can refresh this route before
      // an effect-based check gets a chance to run.
      if (!result) router.push(nextOnboardingStepPath("PERSONAL_DETAILS"));
      return result;
    },
    undefined,
  );
  const [draftState, draftAction, isSavingDraft] = useActionState<SaveDraftState, FormData>(saveDraft, undefined);
  const [bankState, bankAction, isVerifyingBank] = useActionState<VerifyBankState, FormData>(verifyBankAccount, undefined);
  // Controlled, not uncontrolled: React resets uncontrolled form fields when a form action
  // completes, even on a validation error, which otherwise wipes this checkbox on a failed retry.
  const [confirmWillUpdate, setConfirmWillUpdate] = useState(false);

  return (
    <form
      // Deliberately NOT action={submitAction}: React calls the native form.reset() once any
      // <form action={fn}> submission settles, success or failure -- wiping every field in the
      // whole form (not just uncontrolled ones), which silently threw away everything the user
      // had typed on a validation error. Dispatching manually through onSubmit sidesteps that
      // reset, and lets a single form route to three different actions (submit, save draft,
      // verify bank) by which button was clicked, via data-submit.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const which = submitter?.dataset.submit;
        if (which === "draft") draftAction(formData);
        else if (which === "verify") bankAction(formData);
        else submitAction(formData);
      }}
      // The browser checks every `required` field before the submit event even fires -- for
      // ANY submit button in the form, Save draft included, since HTML doesn't know one button
      // means "partial is fine". saveDraft() already accepts partial data server-side; this
      // just stops the browser from blocking it before that code ever runs. Submit's own
      // required-field check still happens -- just server-side (see submitState.error below)
      // instead of the browser's native validation bubble.
      noValidate
      className="space-y-4"
    >
      <div>
        <label className={labelClass} htmlFor="name">Full legal name (as on ID)</label>
        <input id="name" name="name" defaultValue={employee.name} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="preferredName">Preferred name (optional)</label>
        <input id="preferredName" name="preferredName" defaultValue={employee.preferredName ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="dateOfBirth">Date of birth</label>
        <input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={employee.dateOfBirth} required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="phone">Phone number</label>
          <input id="phone" name="phone" defaultValue={employee.phone ?? ""} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="whatsappNumber">WhatsApp number (if different)</label>
          <input id="whatsappNumber" name="whatsappNumber" defaultValue={employee.whatsappNumber ?? ""} placeholder="Leave blank if same as phone" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="personalEmail">Personal email (used for formal notices)</label>
        <input id="personalEmail" name="personalEmail" type="email" defaultValue={employee.personalEmail ?? ""} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="address">Residential address</label>
        <textarea id="address" name="address" rows={2} defaultValue={employee.address ?? ""} required className={inputClass} placeholder="Street, area, city, state -- this is also your place of work" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="emergencyContactName">Emergency contact name</label>
          <input id="emergencyContactName" name="emergencyContactName" defaultValue={employee.emergencyContactName ?? ""} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="emergencyContactPhone">Emergency contact phone</label>
          <input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={employee.emergencyContactPhone ?? ""} required className={inputClass} />
        </div>
      </div>

      <div className="rounded-btn border border-border bg-paper-2 p-4 text-sm text-slate">
        <p><span className="text-slate-light">Job title:</span> {employee.roleTitle} at {employee.clientOrgName}</p>
        <p><span className="text-slate-light">Shift:</span> {employee.shiftLabel ? `${employee.shiftLabel}${employee.shiftDescription ? ` -- ${employee.shiftDescription}` : ""}` : "Not yet assigned -- contact our team"}</p>
      </div>

      <BankFields
        banks={banks}
        banksError={banksError}
        initialAccountNumber={employee.bankAccountNumber}
        initialBankName={employee.bankName}
        initialAccountHolderName={employee.bankAccountHolderName}
        state={bankState}
        isPending={isVerifyingBank}
      />

      <label className="flex items-start gap-2 text-sm text-slate">
        <input
          type="checkbox"
          name="confirmWillUpdate"
          checked={confirmWillUpdate}
          onChange={(e) => setConfirmWillUpdate(e.target.checked)}
          required
          className="mt-0.5"
        />
        I will tell our team within 7 days if any of these change.
      </label>

      {submitState?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{submitState.error}</p>
      )}
      {draftState && <p className="text-xs text-indigo">Draft saved.</p>}

      <div className="flex items-center gap-3">
        <button type="submit" data-submit="submit" disabled={isSubmitting} className={`${buttonClass} disabled:opacity-50`}>
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
        <button type="submit" data-submit="draft" disabled={isSavingDraft} className="text-sm font-medium text-slate hover:text-indigo disabled:opacity-50">
          {isSavingDraft ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
