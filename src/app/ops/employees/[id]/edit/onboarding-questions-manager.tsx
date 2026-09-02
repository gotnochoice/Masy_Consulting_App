import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { addOnboardingQuestion, deleteOnboardingQuestion } from "../../actions";
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
          {questions.map((q) => {
            const deleteWithIds = deleteOnboardingQuestion.bind(null, q.id, employeeId);
            return (
              <div key={q.id} className="rounded-btn border border-border px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{q.label}</p>
                    <p className="text-xs text-slate-light">
                      {QUESTION_TYPE_OPTIONS.find((o) => o.value === q.type)?.label} · {q.required ? "required" : "optional"}
                      {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOXES") && q.options.length > 0 && ` · ${q.options.join(", ")}`}
                    </p>
                  </div>
                  <ConfirmSubmitButton
                    action={deleteWithIds}
                    confirmMessage={`Remove "${q.label}"? This can't be undone.`}
                    className="shrink-0 text-xs font-medium text-slate-light hover:text-orange"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </div>
                {q.answer && (
                  <p className="mt-2 whitespace-pre-line border-t border-border pt-2 text-sm text-ink">{q.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form action={addWithId} className="space-y-3 border-t border-border pt-4">
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
