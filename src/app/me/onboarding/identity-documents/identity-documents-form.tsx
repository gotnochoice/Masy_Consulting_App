"use client";

import { useActionState, useState } from "react";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { MAX_DOCUMENT_FILE_LABEL } from "@/lib/employee-documents";
import { submitIdentityDocuments, type SubmitIdentityDocumentsState } from "./actions";

export function IdentityDocumentsForm() {
  const [idType, setIdType] = useState<"PASSPORT" | "DRIVERS_LICENSE">("PASSPORT");
  const [addressMode, setAddressMode] = useState<"BILL" | "OTHER">("BILL");
  const [state, formAction, isPending] = useActionState<SubmitIdentityDocumentsState, FormData>(
    submitIdentityDocuments,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-3 rounded-btn border border-border p-4">
        <p className="text-xs font-medium text-slate-light">Valid ID</p>
        <div>
          <label className={labelClass} htmlFor="idDocumentType">Which ID are you uploading?</label>
          <select
            id="idDocumentType"
            name="idDocumentType"
            value={idType}
            onChange={(e) => setIdType(e.target.value as "PASSPORT" | "DRIVERS_LICENSE")}
            className={inputClass}
          >
            <option value="PASSPORT">International passport</option>
            <option value="DRIVERS_LICENSE">Driver&rsquo;s licence</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="idFront">{idType === "DRIVERS_LICENSE" ? "Front" : "Photo page"}</label>
          <input id="idFront" name="idFront" type="file" accept=".jpg,.jpeg,.png,.pdf" required className={inputClass} />
        </div>
        {idType === "DRIVERS_LICENSE" && (
          <div>
            <label className={labelClass} htmlFor="idBack">Back</label>
            <input id="idBack" name="idBack" type="file" accept=".jpg,.jpeg,.png,.pdf" required className={inputClass} />
          </div>
        )}
        <p className="text-xs text-slate-light">JPG, PNG, or PDF, up to {MAX_DOCUMENT_FILE_LABEL}. Only HR can see these.</p>
      </div>

      <div className="space-y-3 rounded-btn border border-border p-4">
        <p className="text-xs font-medium text-slate-light">National Identification Number (NIN)</p>
        <div>
          <label className={labelClass} htmlFor="nin">NIN</label>
          <input id="nin" name="nin" inputMode="numeric" maxLength={11} placeholder="11 digits" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="ninSlip">NIN slip or card (optional, recommended)</label>
          <input id="ninSlip" name="ninSlip" type="file" accept=".jpg,.jpeg,.png,.pdf" className={inputClass} />
        </div>
      </div>

      <div className="space-y-3 rounded-btn border border-border p-4">
        <p className="text-xs font-medium text-slate-light">Proof of address</p>
        <div className="flex gap-4 text-sm text-slate">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="addressProofMode" value="BILL" checked={addressMode === "BILL"} onChange={() => setAddressMode("BILL")} />
            Utility or phone bill
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="addressProofMode" value="OTHER" checked={addressMode === "OTHER"} onChange={() => setAddressMode("OTHER")} />
            I don&rsquo;t have one of these
          </label>
        </div>
        {addressMode === "BILL" ? (
          <div>
            <label className={labelClass} htmlFor="billDate">Date on the bill</label>
            <input id="billDate" name="billDate" type="date" required className={inputClass} />
            <p className="mt-1 text-xs text-slate-light">Must be dated within the last 3 months.</p>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor="otherProofNote">What is this document?</label>
            <input id="otherProofNote" name="otherProofNote" placeholder="e.g. tenancy agreement, bank statement" required className={inputClass} />
            <p className="mt-1 text-xs text-slate-light">HR will review this manually.</p>
          </div>
        )}
        <div>
          <label className={labelClass} htmlFor="addressFile">Upload the document</label>
          <input id="addressFile" name="addressFile" type="file" accept=".jpg,.jpeg,.png,.pdf" required className={inputClass} />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
