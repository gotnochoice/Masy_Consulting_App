"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { EMPLOYEE_DOCUMENT_CATEGORY_LABELS, MAX_DOCUMENT_FILE_LABEL } from "@/lib/employee-documents";
import {
  uploadClientEmployeeDocument,
  deleteClientEmployeeDocument,
  type UploadClientDocumentState,
} from "../../actions";
import type { EmployeeDocument } from "@/generated/prisma/client";

export function DocumentList({ employeeId, documents }: { employeeId: string; documents: EmployeeDocument[] }) {
  const uploadWithId = uploadClientEmployeeDocument.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<UploadClientDocumentState, FormData>(
    uploadWithId,
    undefined,
  );

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Documents</h2>
        <p className="text-xs text-slate-light">
          Employment letters, onboarding paperwork, and other files for this employee -- visible to them on their
          own portal. Anything Masy shares shows up here too.
        </p>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => {
            const deleteWithIds = deleteClientEmployeeDocument.bind(null, doc.id, employeeId);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-btn border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-indigo hover:text-indigo-light"
                  >
                    {doc.label}
                  </a>
                  <p className="text-xs text-slate-light">
                    {EMPLOYEE_DOCUMENT_CATEGORY_LABELS[doc.category]} · {doc.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <ConfirmSubmitButton
                  action={deleteWithIds}
                  confirmMessage={`Delete "${doc.label}"? This can't be undone.`}
                  className="shrink-0 text-xs font-medium text-slate-light hover:text-orange"
                >
                  Delete
                </ConfirmSubmitButton>
              </div>
            );
          })}
        </div>
      )}
      {documents.length === 0 && <p className="text-sm text-slate-light">No documents on file yet.</p>}

      <form action={formAction} className="space-y-3 border-t border-border pt-4">
        <div>
          <label className={labelClass} htmlFor="label">Label</label>
          <input id="label" name="label" placeholder="e.g. Signed offer letter" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue="OTHER" className={inputClass}>
            {Object.entries(EMPLOYEE_DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="file">File</label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
            required
            className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
          />
          <p className="mt-1 text-xs text-slate-light">PDF, Word, JPG, PNG, or WEBP, up to {MAX_DOCUMENT_FILE_LABEL}.</p>
        </div>
        {state?.error && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
          {isPending ? "Uploading…" : "Upload document"}
        </button>
      </form>
    </div>
  );
}
