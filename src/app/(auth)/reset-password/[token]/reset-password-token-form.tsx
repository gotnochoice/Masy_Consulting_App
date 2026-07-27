"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordWithToken } from "@/lib/actions/reset-password-token";
import { labelClass } from "@/lib/form-styles";
import { PasswordInput } from "@/components/password-input";

export function ResetPasswordTokenForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordWithToken.bind(null, token), undefined);

  if (state && "success" in state) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">Your password has been updated.</p>
        <Link href="/login" className="text-sm font-medium text-indigo hover:text-indigo-light">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <PasswordInput id="password" name="password" required autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm password
        </label>
        <PasswordInput id="confirmPassword" name="confirmPassword" required autoComplete="new-password" />
      </div>
      {state && "error" in state && <p className="text-sm text-orange">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-btn bg-indigo px-3 py-2 text-sm font-medium text-white hover:bg-indigo-light disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
