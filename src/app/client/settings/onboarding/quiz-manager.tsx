"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { GenerateQuizState } from "./actions";

type Question = {
  id: string;
  question: string;
  choices: string[];
  correctChoiceIndex: number;
  explanation: string | null;
};

export function QuizManager({
  questions,
  hasAgreement,
  regenerateAction,
  updateAction,
  deleteAction,
}: {
  questions: Question[];
  hasAgreement: boolean;
  regenerateAction: () => Promise<GenerateQuizState>;
  updateAction: (questionId: string, formData: FormData) => Promise<void>;
  deleteAction: (questionId: string) => Promise<void>;
}) {
  const [state, formAction, isPending] = useActionState<GenerateQuizState, FormData>(
    async () => regenerateAction(),
    undefined,
  );

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Comprehension quiz</h2>
          <p className="text-xs text-slate-light">
            New hires must pass this before they can sign the agreement. Generated from your saved agreement
            text, then review and edit each question below.
          </p>
        </div>
      </div>

      <form action={formAction}>
        <button
          type="submit"
          disabled={!hasAgreement || isPending}
          className={`${buttonClass} disabled:opacity-50`}
          title={hasAgreement ? undefined : "Save your employment agreement first"}
        >
          {isPending ? "Generating…" : questions.length > 0 ? "Regenerate from agreement" : "Generate from agreement"}
        </button>
        {state && "error" in state && (
          <p className="mt-2 rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
        )}
        {state && "count" in state && <p className="mt-2 text-xs text-indigo">Generated {state.count} questions below -- review before marking content reviewed.</p>}
      </form>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const updateWithId = updateAction.bind(null, q.id);
          const deleteWithId = deleteAction.bind(null, q.id);
          return (
            <form key={q.id} action={updateWithId} className="space-y-2 rounded-btn border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-light">Question {i + 1}</span>
                <ConfirmSubmitButton
                  action={deleteWithId}
                  confirmMessage="Delete this question?"
                  className="text-xs font-medium text-slate-light hover:text-orange"
                >
                  Delete
                </ConfirmSubmitButton>
              </div>
              <textarea name="question" defaultValue={q.question} rows={2} className={inputClass} />
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="radio" name="correctChoiceIndex" value={idx} defaultChecked={q.correctChoiceIndex === idx} />
                  <input name={`choice${idx}`} defaultValue={q.choices[idx] ?? ""} className={`${inputClass} flex-1`} />
                </div>
              ))}
              <div>
                <label className={labelClass}>Explanation</label>
                <textarea name="explanation" defaultValue={q.explanation ?? ""} rows={2} className={inputClass} />
              </div>
              <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">Save question</button>
            </form>
          );
        })}
        {questions.length === 0 && (
          <p className="text-sm text-slate-light">No questions yet. {hasAgreement ? "Generate from your saved agreement above." : "Save your employment agreement first."}</p>
        )}
      </div>
    </div>
  );
}
