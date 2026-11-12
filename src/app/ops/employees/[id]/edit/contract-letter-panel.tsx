"use client";

import { useActionState, useState, useTransition } from "react";
import {
  draftEmployeeContractLetter,
  saveEmployeeContractLetterDraft,
  uploadContractLetterTemplate,
  removeEmployeeContractLetterTemplate,
  type UploadContractLetterTemplateState,
} from "../../actions";
import { MAX_TEMPLATE_FILE_LABEL } from "@/lib/contract-letter-template-constants";
import { inputClass, buttonClass } from "@/lib/form-styles";

export function ContractLetterPanel({
  employeeId,
  initialDraft,
  templateFileName,
}: {
  employeeId: string;
  initialDraft: string | null;
  templateFileName: string | null;
}) {
  const [letter, setLetter] = useState(initialDraft ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDrafting, startDrafting] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [isRemovingTemplate, startRemovingTemplate] = useTransition();
  const [currentTemplateName, setCurrentTemplateName] = useState(templateFileName);

  const uploadTemplateAction = uploadContractLetterTemplate.bind(null, employeeId);
  async function handleTemplateUpload(prevState: UploadContractLetterTemplateState, formData: FormData) {
    const result = await uploadTemplateAction(prevState, formData);
    if (result && "fileName" in result) setCurrentTemplateName(result.fileName);
    return result;
  }
  const [templateState, templateFormAction, isUploadingTemplate] = useActionState<
    UploadContractLetterTemplateState,
    FormData
  >(handleTemplateUpload, undefined);

  function handleRemoveTemplate() {
    startRemovingTemplate(async () => {
      await removeEmployeeContractLetterTemplate(employeeId);
      setCurrentTemplateName(null);
    });
  }

  function handleDraft() {
    setError(null);
    startDrafting(async () => {
      const result = await draftEmployeeContractLetter(employeeId);
      if ("error" in result) setError(result.error);
      else setLetter(result.letter);
    });
  }

  function handleSave() {
    startSaving(async () => {
      await saveEmployeeContractLetterDraft(employeeId, letter);
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Contract / offer letter</h2>
        <p className="text-xs text-slate-light">
          A draft only -- nothing here is ever sent automatically. Review and edit it, then copy it into however
          you currently send offer letters.
        </p>
      </div>

      <div className="rounded-btn border border-border bg-paper-2 p-3">
        <p className="text-xs font-medium text-ink">Letter template</p>
        <p className="mt-0.5 text-xs text-slate-light">
          Upload your standard offer letter (with your letterhead and usual wording) once -- every draft, for any
          employee, will follow it. Word (.docx), PDF, or plain text, up to {MAX_TEMPLATE_FILE_LABEL}.
        </p>
        {currentTemplateName ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate">Using: <span className="font-medium text-ink">{currentTemplateName}</span></span>
            <button
              type="button"
              onClick={handleRemoveTemplate}
              disabled={isRemovingTemplate}
              className="text-xs font-medium text-orange hover:text-orange disabled:opacity-50"
            >
              {isRemovingTemplate ? "Removing…" : "Remove"}
            </button>
          </div>
        ) : (
          <form action={templateFormAction} className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="template"
              required
              accept=".docx,.pdf,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className={`${inputClass} flex-1 min-w-[180px] py-1.5 text-xs file:mr-3 file:rounded-btn file:border-0 file:bg-indigo file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white`}
            />
            <button type="submit" disabled={isUploadingTemplate} className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50">
              {isUploadingTemplate ? "Reading…" : "Upload template"}
            </button>
          </form>
        )}
        {templateState && "error" in templateState && <p className="mt-1.5 text-xs text-orange">{templateState.error}</p>}
      </div>

      <button
        type="button"
        onClick={handleDraft}
        disabled={isDrafting}
        className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50"
      >
        {isDrafting ? "Drafting…" : letter ? "Redraft with AI" : "Draft with AI"}
      </button>
      {error && <p className="text-xs text-orange">{error}</p>}

      {letter && (
        <div className="space-y-2">
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            rows={14}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSave} disabled={isSaving} className={`${buttonClass} px-3 py-1.5 text-xs disabled:opacity-50`}>
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
