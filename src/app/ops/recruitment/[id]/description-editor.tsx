"use client";

import { useState, useTransition } from "react";
import { draftRoleDescription } from "../actions";
import { inputClass, labelClass } from "@/lib/form-styles";

export function DescriptionEditor({
  roleId,
  initialDescription,
  updateDescription,
}: {
  roleId: string;
  initialDescription: string;
  updateDescription: (formData: FormData) => Promise<void>;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDrafting, startDrafting] = useTransition();

  function handleDraft() {
    setError(null);
    startDrafting(async () => {
      const result = await draftRoleDescription(roleId, brief);
      if ("error" in result) setError(result.error);
      else setDescription(result.description);
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="space-y-1.5">
        <label className={labelClass} htmlFor="briefInput">Draft with AI (optional)</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="briefInput"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. need someone to manage our social media and handle basic bookkeeping"
            className={`${inputClass} flex-1 min-w-[220px]`}
          />
          <button
            type="button"
            onClick={handleDraft}
            disabled={isDrafting}
            className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50"
          >
            {isDrafting ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
        {error && <p className="text-xs text-orange">{error}</p>}
      </div>

      <form action={updateDescription} className="space-y-1">
        <label className={labelClass} htmlFor="description">What candidates see on the application page</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description of the role, responsibilities, and what makes this a good fit."
          className={inputClass}
        />
        <p className="text-xs text-slate-light">
          Wrap text in ** to bold it, e.g. **Key Responsibilities** shows up bold to applicants.
        </p>
        <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
          Save description
        </button>
      </form>
    </div>
  );
}
