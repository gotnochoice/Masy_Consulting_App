"use client";

import { useActionState, useState } from "react";
import { buttonClass, labelClass, inputClass } from "@/lib/form-styles";
import { SignaturePad } from "@/components/signature-pad";
import { signEmploymentAgreement, signHandbook, type SignDocumentState } from "./actions";

function SignPanel({
  title,
  action,
  onSigned,
}: {
  title: string;
  action: (state: SignDocumentState, formData: FormData) => Promise<SignDocumentState>;
  onSigned: () => void;
}) {
  const [state, formAction, isPending] = useActionState<SignDocumentState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result) onSigned();
      return result;
    },
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <h2 className="text-lg font-semibold text-ink">Sign: {title}</h2>
      <div>
        <label className={labelClass} htmlFor="typedName">Type your full name</label>
        <input id="typedName" name="typedName" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Draw your signature</label>
        <SignaturePad name="signatureImageDataUrl" />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate">
        <input type="checkbox" name="confirmLegal" required className="mt-0.5" />
        I agree this is my legal signature.
      </label>
      {state?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Signing…" : "Sign"}
      </button>
    </form>
  );
}

export function SignatureFlow({ initialDone }: { initialDone: { agreement: boolean; handbook: boolean } }) {
  const [section, setSection] = useState<"AGREEMENT" | "HANDBOOK" | "DONE">(
    !initialDone.agreement ? "AGREEMENT" : !initialDone.handbook ? "HANDBOOK" : "DONE",
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-xs text-slate-light">
        <span className={section !== "DONE" || initialDone.agreement ? "font-medium text-indigo" : ""}>Agreement ·</span>
        <span className={section === "HANDBOOK" || section === "DONE" ? "font-medium text-indigo" : ""}>Handbook</span>
      </div>
      {section === "AGREEMENT" && <SignPanel title="Employment Agreement" action={signEmploymentAgreement} onSigned={() => setSection("HANDBOOK")} />}
      {section === "HANDBOOK" && <SignPanel title="Employee Handbook" action={signHandbook} onSigned={() => setSection("DONE")} />}
      {section === "DONE" && (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Both documents signed -- submitted for countersignature.</p>
        </div>
      )}
    </div>
  );
}
