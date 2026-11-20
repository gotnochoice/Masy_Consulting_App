"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, labelClass, inputClass } from "@/lib/form-styles";
import { SignaturePad } from "@/components/signature-pad";
import { signEmploymentAgreement, signHandbook, completeSignatureWithoutDocuments, type SignDocumentState } from "./actions";

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
  // Controlled, not uncontrolled: React resets uncontrolled form fields when a form action
  // completes, even on a validation error, which otherwise wipes this checkbox on a failed retry.
  const [confirmLegal, setConfirmLegal] = useState(false);

  return (
    <form
      // See guarantors-form.tsx: avoids the native form.reset() React runs after any
      // <form action={fn}> submission settles, which would otherwise wipe the signature, typed
      // name, and checkbox on a failed retry.
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
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
        <input
          type="checkbox"
          name="confirmLegal"
          checked={confirmLegal}
          onChange={(e) => setConfirmLegal(e.target.checked)}
          required
          className="mt-0.5"
        />
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

export function SignatureFlow({
  initialDone,
  hasAgreement,
  hasHandbook,
}: {
  initialDone: { agreement: boolean; handbook: boolean };
  hasAgreement: boolean;
  hasHandbook: boolean;
}) {
  // Skip whichever document the client never set up, same as the acknowledgments step -- an
  // employer with only an agreement and no handbook shouldn't block their hires on signing a
  // document that doesn't exist.
  const sections: ("AGREEMENT" | "HANDBOOK")[] = [...(hasAgreement ? (["AGREEMENT"] as const) : []), ...(hasHandbook ? (["HANDBOOK"] as const) : [])];
  const doneMap = { AGREEMENT: initialDone.agreement, HANDBOOK: initialDone.handbook };
  const firstIncomplete = sections.find((s) => !doneMap[s]) ?? "DONE";
  const [section, setSection] = useState<"AGREEMENT" | "HANDBOOK" | "DONE">(firstIncomplete);
  const router = useRouter();
  useEffect(() => {
    // Signature is currently out of the compulsory onboarding sequence (see
    // ONBOARDING_STEP_ORDER), so there's no "next step" to route to -- back to the overview.
    if (section === "DONE") router.push("/me/onboarding");
  }, [section, router]);

  async function advance(current: "AGREEMENT" | "HANDBOOK") {
    const idx = sections.indexOf(current);
    const next = sections[idx + 1];
    setSection(next ?? "DONE");
  }

  // Neither document exists -- nothing to sign at all. Finalize immediately rather than
  // leaving the step stuck with no panel to show and no action to trigger it.
  useEffect(() => {
    if (sections.length === 0 && section !== "DONE") {
      completeSignatureWithoutDocuments().then((result) => {
        if (result?.error) console.error("[signature] failed to finalize with no documents:", result.error);
        setSection("DONE");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (sections.length === 0) {
    return (
      <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
        <p className="font-medium">Nothing to sign for this step -- moving on.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-xs text-slate-light">
        {sections.map((s, i) => (
          <span key={s} className={i <= sections.indexOf(section as "AGREEMENT" | "HANDBOOK") || section === "DONE" ? "font-medium text-indigo" : ""}>
            {s === "AGREEMENT" ? "Agreement" : "Handbook"}{i < sections.length - 1 ? " ·" : ""}
          </span>
        ))}
      </div>
      {section === "AGREEMENT" && <SignPanel title="Employment Agreement" action={signEmploymentAgreement} onSigned={() => advance("AGREEMENT")} />}
      {section === "HANDBOOK" && <SignPanel title="Employee Handbook" action={signHandbook} onSigned={() => advance("HANDBOOK")} />}
      {section === "DONE" && (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">Signed -- submitted for countersignature.</p>
        </div>
      )}
    </div>
  );
}
