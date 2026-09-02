import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import {
  addOnboardingQuestion,
  bulkAddOnboardingQuestions,
  updateOnboardingQuestion,
  markAllOnboardingQuestionsRequired,
  deleteOnboardingQuestion,
} from "../../actions";
import { UploadOnboardingQuestionsPanel } from "./upload-onboarding-questions-panel";
import type { OnboardingQuestion } from "@/generated/prisma/client";

const QUESTION_TYPE_OPTIONS = [
  { value: "SHORT_TEXT", label: "Short answer" },
  { value: "LONG_TEXT", label: "Long answer" },
  { value: "LINK", label: "Link" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice (pick one)" },
  { value: "CHECKBOXES", label: "Checkboxes (pick multiple)" },
];

export function OnboardingQuestionsManager({
  employeeId,
  questions,
}: {
  employeeId: string;
  questions: OnboardingQuestion[];
}) {
  const addWithId = addOnboardingQuestion.bind(null, employeeId);
  const bulkAddWithId = bulkAddOnboardingQuestions.bind(null, employeeId);
  const markAllRequiredWithId = markAllOnboardingQuestionsRequired.bind(null, employeeId);

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Onboarding questions</h2>
        <p className="text-xs text-slate-light">
          Extra questions just for this employee, shown on their onboarding link alongside the usual details --
          e.g. guarantor name/phone/address for a driver, or license details. Answers show up here once they submit.
        </p>
      </div>

      <UploadOnboardingQuestionsPanel employeeId={employeeId} />

      {questions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
              {questions.length} question{questions.length === 1 ? "" : "s"}
            </p>
            <form action={markAllRequiredWithId}>
              <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">
                Mark all as required
              </button>
            </form>
          </div>
          {questions.map((q) => {
            const deleteWithIds = deleteOnboardingQuestion.bind(null, q.id, employeeId);
            const updateWithIds = updateOnboardingQuestion.bind(null, q.id, employeeId);
            return (
              <details key={q.id} className="rounded-btn border border-border px-3 py-2">
                <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{q.label}</p>
                    <p className="text-xs text-slate-light">
                      {QUESTION_TYPE_OPTIONS.find((o) => o.value === q.type)?.label} · {q.required ? "required" : "optional"}
                      {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOXES") && q.options.length > 0 && ` · ${q.options.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs font-medium text-indigo">Edit</span>
                    <ConfirmSubmitButton
                      action={deleteWithIds}
                      confirmMessage={`Remove "${q.label}"? This can't be undone.`}
                      className="text-xs font-medium text-slate-light hover:text-orange"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </div>
                </summary>

                <form action={updateWithIds} className="mt-3 space-y-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className={labelClass} htmlFor={`label-${q.id}`}>Question</label>
                      <input id={`label-${q.id}`} name="label" required defaultValue={q.label} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`type-${q.id}`}>Answer type</label>
                      <select id={`type-${q.id}`} name="type" defaultValue={q.type} className={inputClass}>
                        {QUESTION_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm text-slate">
                      <input type="checkbox" name="required" defaultChecked={q.required} className="rounded border-border" />
                      Required
                    </label>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`options-${q.id}`}>
                      Choices (for multiple choice or checkboxes only, one per line)
                    </label>
                    <textarea
                      id={`options-${q.id}`}
                      name="options"
                      rows={3}
                      defaultValue={q.options.join("\n")}
                      placeholder={"Option A\nOption B\nOption C"}
                      className={inputClass}
                    />
                  </div>
                  <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                    Save changes
                  </button>
                </form>

                {q.answer && (
                  <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm text-ink">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-light">Answer: </span>
                    {q.answer}
                  </p>
                )}
              </details>
            );
          })}
        </div>
      )}

      <form action={bulkAddWithId} className="space-y-2 border-t border-border pt-4">
        <label className={labelClass} htmlFor="bulkLabels">Paste a list of questions</label>
        <p className="text-xs text-slate-light">
          One per line, added as short-answer, required by default. Put a <code>?</code> at the start of a line to
          make that one optional (e.g. <code>? Spouse&rsquo;s phone number</code>). For anything else -- long
          answer, multiple choice, checkboxes -- use &ldquo;Add a question&rdquo; below instead.
        </p>
        <textarea
          id="bulkLabels"
          name="bulkLabels"
          rows={5}
          placeholder={"Driver's license number\nYears of driving experience\n? Spouse's phone number"}
          className={inputClass}
        />
        <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
          Add these questions
        </button>
      </form>

      <form action={addWithId} className="space-y-3 border-t border-border pt-4">
        <p className={labelClass}>Add a question</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className={labelClass} htmlFor="label">Question</label>
            <input id="label" name="label" placeholder="e.g. Guarantor's full name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="type">Answer type</label>
            <select id="type" name="type" defaultValue="SHORT_TEXT" className={inputClass}>
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate">
            <input type="checkbox" name="required" defaultChecked className="rounded border-border" />
            Required
          </label>
        </div>
        <div>
          <label className={labelClass} htmlFor="options">
            Choices (for multiple choice or checkboxes only, one per line)
          </label>
          <textarea id="options" name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} className={inputClass} />
        </div>
        <button type="submit" className={buttonClass}>Add question</button>
      </form>
    </div>
  );
}
