"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/forgot-password";
import { inputClass, labelClass } from "@/lib/form-styles";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, undefined);

  if (state && "sent" in state) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">
          {state.emailConfigured
            ? "If that email matches an account, a reset link is on its way. It expires in 1 hour."
            : "Password reset by email isn't set up yet. Contact your Masy HR contact to reset your password."}
        </p>
        <Link href="/login" className="text-sm font-medium text-indigo hover:text-indigo-light">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      {state && "error" in state && <p className="text-sm text-orange">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-btn bg-indigo px-3 py-2 text-sm font-medium text-white hover:bg-indigo-light disabled:opacity-50"
      >
        {isPending ? "Sending..." : "Send reset link"}
      </button>
      <Link href="/login" className="block text-center text-sm font-medium text-slate hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}
