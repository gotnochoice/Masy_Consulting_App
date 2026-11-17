"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/lib/form-styles";
import { SignaturePad } from "@/components/signature-pad";
import { raiseConditionDisagreement, signPropertyHandover, type DisagreeState, type SignHandoverState } from "./actions";

type Asset = {
  id: string;
  itemType: string;
  brand: string | null;
  model: string | null;
  serialOrImei: string | null;
  accessories: string[];
  conditionNotes: string | null;
  verifiedAt: Date | null;
  managementApprovedAt: Date | null;
  employeeDisagreesNote: string | null;
};

function DisagreeForm({ assetId }: { assetId: string }) {
  const action = raiseConditionDisagreement.bind(null, assetId);
  const [state, formAction, isPending] = useActionState<DisagreeState, FormData>(action, undefined);

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-btn bg-paper-2 p-3">
      <label className={labelClass}>Something different about this item?</label>
      <textarea name="note" rows={2} placeholder="Describe the condition difference" className={inputClass} />
      <input name="photo" type="file" accept="image/*" className={inputClass} />
      {state?.error && <p className="text-xs text-orange">{state.error}</p>}
      <button type="submit" disabled={isPending} className="text-xs font-medium text-indigo hover:text-indigo-light disabled:opacity-50">
        {isPending ? "Submitting…" : "Flag this"}
      </button>
    </form>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div className="space-y-1 rounded-btn border border-border p-3 text-sm">
      <p className="font-medium text-ink">
        {asset.itemType}{asset.brand ? ` -- ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}
      </p>
      {asset.serialOrImei && <p className="text-xs text-slate-light">Serial/IMEI: {asset.serialOrImei}</p>}
      {asset.accessories.length > 0 && <p className="text-xs text-slate-light">Accessories: {asset.accessories.join(", ")}</p>}
      {asset.conditionNotes && <p className="text-xs text-slate">Condition: {asset.conditionNotes}</p>}
      {asset.employeeDisagreesNote ? (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-2 py-1.5 text-xs text-orange">
          You flagged: {asset.employeeDisagreesNote}
        </p>
      ) : (
        <DisagreeForm assetId={asset.id} />
      )}
    </div>
  );
}

export function PropertyHandoverFlow({ assets, allReady }: { assets: Asset[]; allReady: boolean }) {
  const [state, formAction, isPending] = useActionState<SignHandoverState, FormData>(signPropertyHandover, undefined);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
      </div>

      {!allReady ? (
        <p className="rounded-btn border border-border bg-paper-2 px-4 py-3 text-sm text-slate-light">
          Waiting on HR to verify and approve this equipment before you can sign.
        </p>
      ) : (
        <form action={formAction} className="space-y-4 border-t border-border pt-4">
          <h2 className="text-lg font-semibold text-ink">Sign for this equipment</h2>
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
      )}
    </div>
  );
}
