"use client";

import { useActionState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitReview, type SubmitReviewState } from "./actions";
import type { ReviewTemplateSection } from "@/lib/review-templates";

export function ReviewForm({ roleTitle, template }: { roleTitle: string; template: ReviewTemplateSection[] }) {
  const [state, formAction, isPending] = useActionState<SubmitReviewState, FormData>(submitReview, undefined);

  return (
    <div className="rounded-card border border-border bg-paper p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Submit a self-assessment</h2>
      <p className="mb-4 text-xs text-slate-light">Tailored to your role as {roleTitle}.</p>
      <form action={formAction} className="space-y-8">
        <div className="max-w-xs">
          <label className={labelClass} htmlFor="cycle">Review cycle</label>
          <input id="cycle" name="cycle" placeholder="e.g. July 2026" required className={inputClass} />
        </div>

        {template.map((section, si) => (
          <div key={si} className="space-y-4">
            <p className="border-b border-border pb-2 text-sm font-semibold text-ink">{section.section}</p>
            {section.questions.map((question, qi) => (
              <div key={qi}>
                <label className={labelClass} htmlFor={`s${si}_q${qi}`}>{question}</label>
                <textarea id={`s${si}_q${qi}`} name={`s${si}_q${qi}`} rows={3} required className={inputClass} />
              </div>
            ))}
          </div>
        ))}

        <div className="border-t border-border pt-4">
          <label className={labelClass} htmlFor="selfAssessment">Anything else you&apos;d like to add? (optional)</label>
          <textarea id="selfAssessment" name="selfAssessment" rows={3} className={inputClass} />
        </div>

        {state?.error && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
          {isPending ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
