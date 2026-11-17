"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import type { SaveTextState } from "./actions";

type DraftState = { draft: string } | { error: string } | undefined;

export function DocumentEditor({
  title,
  helpText,
  currentText,
  version,
  saveAction,
  uploadAction,
  draftAction,
  draftFields,
}: {
  title: string;
  helpText: string;
  currentText: string | null;
  version: string | null;
  saveAction: (state: SaveTextState, formData: FormData) => Promise<SaveTextState>;
  uploadAction?: (state: DraftState, formData: FormData) => Promise<DraftState>;
  draftAction?: (state: DraftState, formData: FormData) => Promise<DraftState>;
  draftFields?: "agreement" | "handbook";
}) {
  const [text, setText] = useState(currentText ?? "");
  const [showAiForm, setShowAiForm] = useState(false);
  const [saveState, saveFormAction, isSaving] = useActionState<SaveTextState, FormData>(saveAction, undefined);
  const [uploadState, uploadFormAction, isUploading] = useActionState<DraftState, FormData>(
    uploadAction ?? (async (s) => s),
    undefined,
  );
  const [draftState, draftFormAction, isDrafting] = useActionState<DraftState, FormData>(
    draftAction ?? (async (s) => s),
    undefined,
  );

  // Adjust local editable text when a new AI draft or upload result arrives, tracked against the
  // last-seen state object (not `text` itself) so this runs once per result, not on every keystroke.
  const [lastSeenUpload, setLastSeenUpload] = useState(uploadState);
  if (uploadState !== lastSeenUpload) {
    setLastSeenUpload(uploadState);
    if (uploadState && "draft" in uploadState) setText(uploadState.draft);
  }
  const [lastSeenDraft, setLastSeenDraft] = useState(draftState);
  if (draftState !== lastSeenDraft) {
    setLastSeenDraft(draftState);
    if (draftState && "draft" in draftState) setText(draftState.draft);
  }

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-xs text-slate-light">{helpText}</p>
        </div>
        {version && <span className="shrink-0 rounded-btn bg-paper-2 px-2 py-0.5 text-xs text-slate-light">v{version}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {draftAction && (
          <button
            type="button"
            onClick={() => setShowAiForm((v) => !v)}
            className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint"
          >
            {showAiForm ? "Hide AI draft" : "Draft with AI"}
          </button>
        )}
        {uploadAction && (
          <form action={uploadFormAction} className="flex items-center gap-2">
            <input
              name="document"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => e.target.form?.requestSubmit()}
              className="text-xs text-slate-light file:mr-2 file:rounded-btn file:border-0 file:bg-paper-2 file:px-2 file:py-1 file:text-xs"
            />
            {isUploading && <span className="text-xs text-slate-light">Reading…</span>}
          </form>
        )}
      </div>
      {uploadState && "error" in uploadState && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{uploadState.error}</p>
      )}

      {showAiForm && draftAction && (
        <form action={draftFormAction} className="space-y-3 rounded-btn border border-border bg-paper-2 p-4">
          <div>
            <label className={labelClass} htmlFor="workMode">Work mode</label>
            <select id="workMode" name="workMode" defaultValue="REMOTE" className={inputClass}>
              <option value="REMOTE">Remote</option>
              <option value="ON_SITE">On-site</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          {draftFields === "agreement" ? (
            <>
              <div>
                <label className={labelClass} htmlFor="shiftDescription">Shift / working hours</label>
                <input id="shiftDescription" name="shiftDescription" placeholder="e.g. 9am-5pm WAT, Mon-Fri" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="payStructure">Pay structure</label>
                <textarea id="payStructure" name="payStructure" rows={2} placeholder="e.g. monthly salary, paid last working day; discretionary bonus based on monthly scorecard" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="probationAndNotice">Probation and notice period</label>
                <input id="probationAndNotice" name="probationAndNotice" placeholder="e.g. 3 months probation, 2 weeks notice" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="leavePolicy">Leave policy</label>
                <input id="leavePolicy" name="leavePolicy" placeholder="e.g. 6 days annual leave after 12 months, 12 days sick leave" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="equipmentPolicy">Company property, if any</label>
                <input id="equipmentPolicy" name="equipmentPolicy" placeholder="e.g. laptop issued, returned on exit" className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="otherTerms">Anything else to include</label>
                <textarea id="otherTerms" name="otherTerms" rows={2} className={inputClass} />
              </div>
            </>
          ) : (
            <div>
              <label className={labelClass} htmlFor="brief">Tell us about how your team works day to day</label>
              <textarea
                id="brief"
                name="brief"
                rows={4}
                required
                placeholder="e.g. we're a small remote team, communicate mainly on WhatsApp, expect replies within a few hours during shift..."
                className={inputClass}
              />
            </div>
          )}
          {draftState && "error" in draftState && (
            <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{draftState.error}</p>
          )}
          <button type="submit" disabled={isDrafting} className={`${buttonClass} disabled:opacity-50`}>
            {isDrafting ? "Drafting…" : "Generate draft"}
          </button>
        </form>
      )}

      <form action={saveFormAction} className="space-y-3">
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder="Paste your own text, upload a document, or draft one with AI above."
          className={`${inputClass} font-mono text-xs leading-relaxed`}
        />
        {saveState && "error" in saveState && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{saveState.error}</p>
        )}
        {saveState && "savedAt" in saveState && <p className="text-xs text-indigo">Saved.</p>}
        <button type="submit" disabled={isSaving} className={`${buttonClass} disabled:opacity-50`}>
          {isSaving ? "Saving…" : `Save ${title.toLowerCase()}`}
        </button>
      </form>
    </div>
  );
}
