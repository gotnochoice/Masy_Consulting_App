"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { inputClass, labelClass } from "@/lib/form-styles";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      {error && <p className="text-sm text-orange">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-btn bg-indigo px-3 py-2 text-sm font-medium text-white hover:bg-indigo-light disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
