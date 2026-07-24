"use client";

import { useActionState } from "react";
import type { RoleQuestion } from "@/generated/prisma/client";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { ApplyState } from "./actions";

export function ApplyForm({
  action,
  questions,
}: {
  action: (prevState: ApplyState, formData: FormData) => Promise<ApplyState>;
  questions: RoleQuestion[];
}) {
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(action, {});

  if (state.success) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-medium text-ink">Application received.</p>
        <p className="mt-1 text-sm text-slate">
          Thank you for applying — Masy Consulting reviews every application on behalf of our client and will reach
          out if there&apos;s a fit.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: real applicants never see or fill this field */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="company_website">Leave this field blank</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className={labelClass} htmlFor="name">Full name</label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="phone">Phone</label>
        <input id="phone" name="phone" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="yearsExperience">Years of experience in this kind of role</label>
        <input id="yearsExperience" name="yearsExperience" required placeholder="e.g. 3 years" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="resumeLink">Link to your CV / resume</label>
        <input
          id="resumeLink"
          name="resumeLink"
          type="url"
          placeholder="https://drive.google.com/..."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-light">A shareable Google Drive, Dropbox, or LinkedIn link works.</p>
      </div>

      {questions.map((q) => (
        <div key={q.id}>
          <label className={labelClass} htmlFor={`answer_${q.id}`}>
            {q.label}
            {!q.required && <span className="text-slate-light"> (optional)</span>}
          </label>
          {q.type === "LONG_TEXT" ? (
            <textarea id={`answer_${q.id}`} name={`answer_${q.id}`} required={q.required} rows={3} className={inputClass} />
          ) : (
            <input
              id={`answer_${q.id}`}
              name={`answer_${q.id}`}
              type={q.type === "LINK" ? "url" : "text"}
              required={q.required}
              className={inputClass}
            />
          )}
        </div>
      ))}

      {state.error && <p className="text-sm text-orange">{state.error}</p>}

      <p className="text-xs text-slate-light">
        By submitting this application, you agree that your information will be used only to evaluate you for this
        role and shared with the hiring company. We won&apos;t use it for anything else.
      </p>

      <button type="submit" disabled={isPending} className={`w-full ${buttonClass} disabled:opacity-50`}>
        {isPending ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
