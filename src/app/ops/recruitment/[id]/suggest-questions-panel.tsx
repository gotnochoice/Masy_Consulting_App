"use client";

import { useActionState, useState, useTransition } from "react";
import { suggestQuestionsForRole, addSuggestedQuestions, type SuggestQuestionsState } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "short answer",
  LONG_TEXT: "long answer",
  LINK: "link",
};

export function SuggestQuestionsPanel({ roleId }: { roleId: string }) {
  const action = suggestQuestionsForRole.bind(null, roleId);
  const [state, formAction, isPending] = useActionState<SuggestQuestionsState, FormData>(action, undefined);
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
      await addSuggestedQuestions(roleId, chosen);
      setAdded(true);
    });
  }

  if (added) {
    return <p className="mb-4 text-xs font-medium text-indigo">Questions added below.</p>;
  }

  return (
    <div className="mb-4">
      {!suggestions && (
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50"
          >
            {isPending ? "Thinking…" : "Suggest questions with AI"}
          </button>
        </form>
      )}
      {state && "error" in state && <p className="mt-2 text-xs text-orange">{state.error}</p>}
      {suggestions && (
        <div className="mt-3 space-y-2 rounded-btn border border-border bg-paper-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
            AI suggestions, review and add
          </p>
          {suggestions.map((q, i) => (
            <label key={i} className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                defaultChecked
                onChange={() => toggle(i)}
                className="mt-0.5 rounded border-border"
              />
              <span>
                {q.label}
                <span className="ml-1 text-xs text-slate-light">
                  ({TYPE_LABELS[q.type]}, {q.required ? "required" : "optional"})
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
