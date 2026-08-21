"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeOnboarding, type OnboardingFormState } from "./actions";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { PasswordInput } from "@/components/password-input";
import { MAX_PHOTO_FILE_LABEL } from "@/lib/photo";

const sectionLabelClass = "text-xs font-semibold uppercase tracking-widest text-slate-light";

export function OnboardingForm({
  token,
  name,
  email,
  orgName,
  initiallyValid,
  initiallyCompleted,
}: {
  token: string;
  name: string;
  email: string;
  orgName: string;
  initiallyValid: boolean;
  initiallyCompleted: boolean;
}) {
  const action = completeOnboarding.bind(null, token);
  const [state, formAction, isPending] = useActionState<OnboardingFormState, FormData>(action, undefined);

  // Captured once at mount, not re-derived from props: a successful submit updates the
  // invite record server-side, which would otherwise flip these back to "invalid" on the
  // automatic post-action refresh and yank the success message away before it's ever seen.
  const [wasValidAtLoad] = useState(initiallyValid);
  const [wasCompletedAtLoad] = useState(initiallyCompleted);

  if (state && "success" in state) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">
          You&rsquo;re all set. Your details are saved and your account is ready.
        </p>
        <Link href="/login" className="text-sm font-medium text-indigo hover:text-indigo-light">
          Sign in
        </Link>
      </div>
    );
  }

  if (!wasValidAtLoad) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">
          {wasCompletedAtLoad
            ? "This onboarding link has already been used."
            : "This onboarding link is invalid or has expired."}
        </p>
        <p className="text-sm text-slate">Ask Masy Consulting to send you a new link.</p>
        <Link href="/login" className="text-sm font-medium text-indigo hover:text-indigo-light">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-slate">
        Welcome to {orgName}. Fill in your details to set up your account.
      </p>
      <form action={formAction} className="space-y-6">
        <div className="space-y-4">
          <p className={sectionLabelClass}>Your info</p>
          <div>
            <label className={labelClass} htmlFor="photo">Photo</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
            />
            <p className="mt-1 text-xs text-slate-light">JPG, PNG, or WEBP, up to {MAX_PHOTO_FILE_LABEL}.</p>
          </div>
          <div>
            <label className={labelClass} htmlFor="name">Full name</label>
            <input id="name" name="name" defaultValue={name} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="address">Address</label>
            <input id="address" name="address" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="whatsappNumber">WhatsApp number</label>
              <input id="whatsappNumber" name="whatsappNumber" type="tel" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className={sectionLabelClass}>Bank details (for payroll)</p>
          <p className="text-xs text-slate-light">Only Masy Ops and your organization&rsquo;s owner can see this.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bankName">Bank name</label>
              <input id="bankName" name="bankName" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bankAccountNumber">Account number</label>
              <input id="bankAccountNumber" name="bankAccountNumber" className={inputClass} />
            </div>
          </div>
          <div className="sm:w-1/2 sm:pr-2">
            <label className={labelClass} htmlFor="bankAccountHolderName">Account holder name</label>
            <input id="bankAccountHolderName" name="bankAccountHolderName" className={inputClass} />
            <p className="mt-1 text-xs text-slate-light">Only fill this in if it&rsquo;s different from your name above.</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className={sectionLabelClass}>Set up your login</p>
          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={email} required className={inputClass} />
            <p className="mt-1 text-xs text-slate-light">This is what you&rsquo;ll log in with.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <PasswordInput id="password" name="password" required autoComplete="new-password" />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirmPassword">Confirm password</label>
              <PasswordInput id="confirmPassword" name="confirmPassword" required autoComplete="new-password" />
            </div>
          </div>
        </div>

        {state && "error" in state && <p className="text-sm text-orange">{state.error}</p>}

        <button type="submit" disabled={isPending} className={`${buttonClass} w-full disabled:opacity-50`}>
          {isPending ? "Saving..." : "Save and create my account"}
        </button>
      </form>
    </>
  );
}
