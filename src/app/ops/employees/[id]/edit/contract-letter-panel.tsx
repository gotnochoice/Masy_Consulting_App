"use client";

import { useState, useTransition } from "react";
import { draftEmployeeContractLetter, saveEmployeeContractLetterDraft } from "../../actions";
import { inputClass, buttonClass } from "@/lib/form-styles";

export function ContractLetterPanel({ employeeId, initialDraft }: { employeeId: string; initialDraft: string | null }) {
  const [letter, setLetter] = useState(initialDraft ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDrafting, startDrafting] = useTransition();
  const [isSaving, startSaving] = useTransition();

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
