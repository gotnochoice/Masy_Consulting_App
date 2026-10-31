"use client";

import { useActionState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitReview, saveReviewDraft, type SubmitReviewState, type SaveReviewDraftState } from "./actions";
import type { ReviewTemplateSection } from "@/lib/review-templates";

type DraftResponses = { section: string; answers: { question: string; answer: string }[] }[];

export function ReviewForm({
  roleTitle,
  template,
  draft,
}: {
  roleTitle: string;
  template: ReviewTemplateSection[];
  draft: { cycle: string; selfAssessment: string; responses: DraftResponses } | null;
}) {
  const [state, formAction, isSubmitting] = useActionState<SubmitReviewState, FormData>(submitReview, undefined);
  const [draftState, draftFormAction, isSavingDraft] = useActionState<SaveReviewDraftState, FormData>(
    saveReviewDraft,
    undefined,
  );
  const justSaved = !!draftState && "savedAt" in draftState;

  return (
    <div className="rounded-card border border-border bg-paper p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Submit a self-assessment</h2>
      <p className="mb-4 text-xs text-slate-light">Tailored to your role as {roleTitle}.</p>
      {draft && (
        <p className="mb-4 rounded-btn border border-dashed border-border bg-paper-2 px-3.5 py-2.5 text-xs text-slate">
          Picking up a saved draft -- your answers below are exactly where you left them.
        </p>
      )}
      <form action={formAction} className="space-y-8">
        <div className="max-w-xs">
          <label className={labelClass} htmlFor="cycle">Review cycle</label>
          <input id="cycle" name="cycle" placeholder="e.g. July 2026" defaultValue={draft?.cycle ?? ""} className={inputClass} />
        </div>

        {template.map((section, si) => (
          <div key={si} className="space-y-4">
            <p className="border-b border-border pb-2 text-sm font-semibold text-ink">{section.section}</p>
            {section.questions.map((question, qi) => (
              <div key={qi}>
                <label className={labelClass} htmlFor={`s${si}_q${qi}`}>{question}</label>
                <textarea
                  id={`s${si}_q${qi}`}
                  name={`s${si}_q${qi}`}
                  rows={3}
                  defaultValue={draft?.responses[si]?.answers[qi]?.answer ?? ""}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        ))}

        <div className="border-t border-border pt-4">
          <label className={labelClass} htmlFor="selfAssessment">Anything else you&apos;d like to add? (optional)</label>
          <textarea
            id="selfAssessment"
            name="selfAssessment"
            rows={3}
            defaultValue={draft?.selfAssessment ?? ""}
            className={inputClass}
          />
        </div>

        {state?.error && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">
            {state.error}
          </p>
        )}
        {draftState && "error" in draftState && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">
            Couldn&apos;t save draft: {draftState.error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className={`${buttonClass} disabled:opacity-50`}>
            {isSubmitting ? "Submitting…" : "Submit"}
          </button>
          <button
            type="submit"
            formAction={draftFormAction}
            disabled={isSavingDraft}
            className="rounded-btn border border-border px-3 py-2 text-sm font-medium text-slate hover:text-ink disabled:opacity-50"
          >
            {isSavingDraft ? "Saving…" : "Save draft"}
          </button>
          {justSaved && <span className="text-xs font-medium text-indigo">Draft saved</span>}
        </div>
        <p className="text-xs text-slate-light">
          Save draft keeps whatever you&apos;ve written so far -- nothing is checked or sent to Masy until you hit
          Submit.
        </p>
      </form>
    </div>
  );
}
