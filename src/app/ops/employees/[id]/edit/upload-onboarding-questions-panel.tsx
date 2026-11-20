"use client";

import { useActionState, useState, useTransition } from "react";
import {
  extractOnboardingQuestionsFromFile,
  addSuggestedOnboardingQuestions,
  type ExtractOnboardingQuestionsState,
} from "../../actions";
import { MAX_ONBOARDING_QUESTION_FILE_LABEL } from "@/lib/onboarding";
import { inputClass, buttonClass } from "@/lib/form-styles";

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "short answer",
  LONG_TEXT: "long answer",
  LINK: "link",
  MULTIPLE_CHOICE: "multiple choice",
  CHECKBOXES: "checkboxes",
};

export function UploadOnboardingQuestionsPanel({ employeeId }: { employeeId: string }) {
  const action = extractOnboardingQuestionsFromFile.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<ExtractOnboardingQuestionsState, FormData>(action, undefined);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [isAdding, startAdding] = useTransition();
  const [added, setAdded] = useState(false);

  const suggestions = state && "suggestions" in state ? state.suggestions : null;

  function toggle(i: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAdd() {
    if (!suggestions) return;
    const chosen = suggestions.filter((_, i) => !excluded.has(i));
    if (chosen.length === 0) return;
    startAdding(async () => {
      await addSuggestedOnboardingQuestions(employeeId, chosen);
      setAdded(true);
    });
  }

  if (added) {
    return <p className="mb-4 text-xs font-medium text-indigo">Questions added above.</p>;
  }

  return (
    <div className="mb-4 rounded-btn border border-indigo/30 bg-indigo-tint/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo">
        Already have a form? Upload it and let AI build the questions
      </p>
      <p className="mt-1 text-xs text-slate">
        A guarantor form, next-of-kin form, or any document with a list of fields. Word (.docx), PDF, or plain
        text, up to {MAX_ONBOARDING_QUESTION_FILE_LABEL}.
      </p>
      {!suggestions && (
        <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="document"
            required
            accept=".docx,.pdf,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={`${inputClass} flex-1 min-w-[200px] file:mr-3 file:rounded-btn file:border-0 file:bg-indigo file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white`}
          />
          <button type="submit" disabled={isPending} className={`${buttonClass} shrink-0`}>
            {isPending ? "Reading…" : "Extract questions"}
          </button>
        </form>
      )}
      {state && "error" in state && <p className="mt-2 text-xs text-orange">{state.error}</p>}
      {suggestions && (
        <div className="mt-3 space-y-2 rounded-btn border border-border bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
            Found {suggestions.length} question{suggestions.length === 1 ? "" : "s"}, review and add
          </p>
          {suggestions.map((q, i) => (
            <label key={i} className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" defaultChecked onChange={() => toggle(i)} className="mt-0.5 rounded border-border" />
              <span>
                {q.label}
                <span className="ml-1 text-xs text-slate-light">
                  ({TYPE_LABELS[q.type]}, {q.required ? "required" : "optional"}
                  {q.options.length > 0 && ` — ${q.options.join(", ")}`})
                </span>
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="mt-2 rounded-btn bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-light disabled:opacity-50"
          >
            {isAdding ? "Adding…" : "Add selected questions"}
          </button>
        </div>
      )}
    </div>
  );
}
