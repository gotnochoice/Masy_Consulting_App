"use client";

import { useState, useTransition } from "react";
import { draftRoleFromBrief, addSuggestedQuestions } from "../actions";
import type { SuggestedQuestion } from "@/lib/ai";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";

const TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "short answer",
  LONG_TEXT: "long answer",
  LINK: "link",
};

export function WorkReqPanel({
  roleId,
  updateDescription,
}: {
  roleId: string;
  updateDescription: (formData: FormData) => Promise<void>;
}) {
  const [workReq, setWorkReq] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SuggestedQuestion[] | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [questionsAdded, setQuestionsAdded] = useState(false);
  const [isDrafting, startDrafting] = useTransition();
  const [isAdding, startAdding] = useTransition();

  function handleDraft() {
    setError(null);
    startDrafting(async () => {
      const result = await draftRoleFromBrief(roleId, workReq);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDescription(result.description);
      setQuestions(result.questions);
      setExcluded(new Set());
      setQuestionsAdded(false);
    });
  }

  function toggle(i: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleAddQuestions() {
    if (!questions) return;
    const chosen = questions.filter((_, i) => !excluded.has(i));
    if (chosen.length === 0) return;
    startAdding(async () => {
      await addSuggestedQuestions(roleId, chosen);
      setQuestionsAdded(true);
    });
  }

  return (
    <div className="space-y-4 rounded-card border border-indigo/30 bg-indigo-tint/20 p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">New role? Start here</h2>
        <p className="text-xs text-slate-light">
          Paste the work req (even rough internal notes) and Claude drafts both the application description and
          screening questions together. Review everything below before saving -- nothing here saves itself.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="workReq">Work req</label>
        <textarea
          id="workReq"
          value={workReq}
          onChange={(e) => setWorkReq(e.target.value)}
          rows={5}
          placeholder="Paste the role brief here -- responsibilities, requirements, anything you have."
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleDraft}
          disabled={isDrafting}
          className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50"
        >
          {isDrafting ? "Drafting…" : "Draft description & questions with AI"}
        </button>
        {error && <p className="text-xs text-orange">{error}</p>}
      </div>

      {description !== null && (
        <form action={updateDescription} className="space-y-1.5 border-t border-indigo/20 pt-4">
          <label className={labelClass} htmlFor="workReqDescription">
            Application description (edit freely, then save)
          </label>
          <textarea
            id="workReqDescription"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={inputClass}
          />
          <button type="submit" className={`${buttonClass} px-3 py-1.5 text-xs`}>
            Save description
          </button>
        </form>
      )}

      {questions && questions.length > 0 && (
        <div className="space-y-2 border-t border-indigo/20 pt-4">
          <p className={labelClass}>Screening questions (uncheck any you don&rsquo;t want)</p>
          {questionsAdded ? (
            <p className="text-xs font-medium text-indigo">Questions added below, in Application questions.</p>
          ) : (
            <>
              {questions.map((q, i) => (
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
                onClick={handleAddQuestions}
                disabled={isAdding}
                className={`${buttonClass} px-3 py-1.5 text-xs disabled:opacity-50`}
              >
                {isAdding ? "Adding…" : "Add selected questions"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
