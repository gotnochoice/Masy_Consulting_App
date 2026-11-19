"use client";

import { useActionState, useRef } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { MAX_DOCUMENT_FILE_LABEL } from "@/lib/employee-documents";
import { addAdditionalDocument, deleteAdditionalDocument, type AddAdditionalDocumentState } from "./actions";

type AdditionalDocument = {
  id: string;
  name: string;
  text: string | null;
  fileUrl: string | null;
  fileName: string | null;
};

export function AdditionalDocumentsManager({ documents }: { documents: AdditionalDocument[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<AddAdditionalDocumentState, FormData>(
    async (prev, formData) => {
      const result = await addAdditionalDocument(prev, formData);
      // Clear the form manually on success -- this form deliberately avoids the native
      // <form action={fn}> binding (see the comment below), so React's automatic reset never
      // fires, success or failure. Without this, the just-added document's name/text would
      // stay sitting in the fields, inviting an accidental duplicate re-add.
      if (!result) formRef.current?.reset();
      return result;
    },
    undefined,
  );

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Additional documents (optional)</h2>
        <p className="text-xs text-slate-light">
          Anything else you want new hires to see -- a code of conduct, an NDA, a benefits guide, whatever you
          like. Name it yourself; paste text or upload a file. Shown to every new hire alongside the core
          documents above, but they just read it -- no quiz or sign-off required.
        </p>
      </div>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const deleteWithId = deleteAdditionalDocument.bind(null, doc.id);
            return (
              <li key={doc.id} className="flex items-center justify-between gap-3 rounded-btn border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{doc.name}</p>
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo hover:underline">
                      {doc.fileName || "View file"}
                    </a>
                  ) : (
                    <p className="text-xs text-slate-light line-clamp-1">{doc.text}</p>
                  )}
                </div>
                <ConfirmSubmitButton
                  action={deleteWithId}
                  confirmMessage={`Remove "${doc.name}"? New hires won't see it anymore.`}
                  className="shrink-0 text-xs font-medium text-slate-light hover:text-orange"
                >
                  Remove
                </ConfirmSubmitButton>
              </li>
            );
          })}
        </ul>
      )}

      <form
        ref={formRef}
        // Deliberately NOT action={formAction}: React calls the native form.reset() once any
        // <form action={fn}> submission settles, success or failure -- wiping every field
        // (including the name) on a validation error like "paste text or upload a file".
        onSubmit={(e) => {
          e.preventDefault();
          formAction(new FormData(e.currentTarget));
        }}
        className="space-y-3 border-t border-border pt-4"
      >
        <div>
          <label className={labelClass} htmlFor="additionalDocName">Name</label>
          <input id="additionalDocName" name="name" placeholder="e.g. Code of conduct" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="additionalDocText">Paste text (or upload a file below instead)</label>
          <textarea id="additionalDocText" name="text" rows={4} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="additionalDocFile">Or upload a file</label>
          <input
            id="additionalDocFile"
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
          />
          <p className="mt-1 text-xs text-slate-light">Up to {MAX_DOCUMENT_FILE_LABEL}.</p>
        </div>
        {state?.error && (
          <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
        )}
        <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
          {isPending ? "Adding…" : "Add document"}
        </button>
      </form>
    </div>
  );
}
