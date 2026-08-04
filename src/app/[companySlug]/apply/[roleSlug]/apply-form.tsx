"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RoleQuestion } from "@/generated/prisma/client";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { ApplyState } from "./actions";

const sectionLabelClass = "text-xs font-semibold uppercase tracking-widest text-slate-light";

export function ApplyForm({
  action,
  questions,
  roleTitle,
  companyName,
}: {
  action: (prevState: ApplyState, formData: FormData) => Promise<ApplyState>;
  questions: RoleQuestion[];
  roleTitle: string;
  companyName: string;
}) {
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(action, {});

  if (state.success) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-tint">
          <CheckCircle2 className="h-7 w-7 text-indigo" strokeWidth={2} />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Application received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">
          {state.name ? `Thanks, ${state.name}. ` : ""}
          Your application for <span className="font-medium text-ink">{roleTitle}</span> at{" "}
          <span className="font-medium text-ink">{companyName}</span> has been recorded.
        </p>

        <div className="mx-auto mt-8 max-w-sm space-y-4 border-t border-border pt-6 text-left">
          <div className="flex gap-3">
            <span className="text-xs font-semibold text-indigo">01</span>
            <p className="text-sm text-slate">
              Masy Consulting reviews every application on behalf of {companyName}.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-semibold text-indigo">02</span>
            <p className="text-sm text-slate">
              If there&apos;s a fit, we&apos;ll reach out to you directly{state.email ? ` at ${state.email}` : ""}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Honeypot: real applicants never see or fill this field */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="company_website">Leave this field blank</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-4">
        <p className={sectionLabelClass}>01 · Personal details</p>
        <div>
          <label className={labelClass} htmlFor="name">Full name</label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" required className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="yearsExperience">Years of experience in this kind of role</label>
          <input id="yearsExperience" name="yearsExperience" required placeholder="e.g. 3 years" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="expectedPay">Expected pay range</label>
          <input
            id="expectedPay"
            name="expectedPay"
            required
            placeholder="e.g. ₦250,000 - ₦350,000/month"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="howHeard">How did you hear about this role?</label>
          <select id="howHeard" name="howHeard" required defaultValue="" className={inputClass}>
            <option value="" disabled>Select one</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Instagram / social media">Instagram / social media</option>
            <option value="Job board">Job board</option>
            <option value="Referral from someone">Referral from someone</option>
            <option value="Masy Consulting website">Masy Consulting website</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <p className={sectionLabelClass}>02 · Application materials</p>
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
      </div>

      {questions.length > 0 && (
        <div className="space-y-4 border-t border-border pt-6">
          <p className={sectionLabelClass}>03 · Additional questions</p>
          {questions.map((q) => (
            <div key={q.id}>
              <label className={labelClass} htmlFor={`answer_${q.id}`}>
                {q.label}
                {!q.required && <span className="text-slate-light"> (optional)</span>}
              </label>
              {q.type === "LONG_TEXT" ? (
                <textarea id={`answer_${q.id}`} name={`answer_${q.id}`} required={q.required} rows={3} className={inputClass} />
              ) : q.type === "MULTIPLE_CHOICE" ? (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name={`answer_${q.id}`}
                        value={opt}
                        required={q.required}
                        className="border-border"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
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
        </div>
      )}

      {state.error && <p className="text-sm text-orange">{state.error}</p>}

      <div className="space-y-4 border-t border-border pt-6">
        <p className="text-xs text-slate-light">
          By submitting this application, you agree that your information will be used only to evaluate you for this
          role and shared with {companyName}. We won&apos;t use it for anything else.
        </p>
        <button type="submit" disabled={isPending} className={`w-full ${buttonClass} disabled:opacity-50`}>
          {isPending ? "Submitting..." : "Submit application"}
        </button>
      </div>
    </form>
  );
}
