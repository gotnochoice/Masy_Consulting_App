"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import {
  addCompanyAsset,
  markNoEquipmentIssued,
  verifyCompanyAsset,
  approveCompanyAssetRelease,
  deleteCompanyAsset,
  type AddCompanyAssetState,
} from "../../actions";
import type { CompanyAsset } from "@/generated/prisma/client";

export function CompanyAssetPanel({ employeeId, assets }: { employeeId: string; assets: CompanyAsset[] }) {
  const addWithId = addCompanyAsset.bind(null, employeeId);
  const noEquipmentWithId = markNoEquipmentIssued.bind(null, employeeId);
  const [state, formAction, isPending] = useActionState<AddCompanyAssetState, FormData>(addWithId, undefined);

  const hasNoEquipmentSentinel = assets.some((a) => a.itemType === "NO_EQUIPMENT_ISSUED");
  const realAssets = assets.filter((a) => a.itemType !== "NO_EQUIPMENT_ISSUED");

  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Company property</h2>
        <p className="text-xs text-slate-light">Equipment issued to this employee. Verify and approve before it can be signed for.</p>
      </div>

      {hasNoEquipmentSentinel ? (
        <p className="rounded-btn bg-paper-2 px-3 py-2 text-sm text-slate">No equipment is being issued for this role.</p>
      ) : (
        <>
          <div className="space-y-2">
            {realAssets.map((asset) => {
              const verifyWithIds = verifyCompanyAsset.bind(null, asset.id, employeeId);
              const approveWithIds = approveCompanyAssetRelease.bind(null, asset.id, employeeId);
              const deleteWithIds = deleteCompanyAsset.bind(null, asset.id, employeeId);
              return (
                <div key={asset.id} className="space-y-2 rounded-btn border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink">
                      {asset.itemType}{asset.brand ? ` -- ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}
                    </p>
                    <ConfirmSubmitButton
                      action={deleteWithIds}
                      confirmMessage={`Remove ${asset.itemType} from this employee's record?`}
                      className="text-xs font-medium text-slate-light hover:text-orange"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </div>
                  {asset.serialOrImei && <p className="text-xs text-slate-light">Serial/IMEI: {asset.serialOrImei}</p>}
                  <div className="flex items-center gap-3 text-xs">
                    <span className={asset.verifiedAt ? "text-indigo" : "text-slate-light"}>
                      {asset.verifiedAt ? "✓ Verified" : "Not verified"}
                    </span>
                    <span className={asset.managementApprovedAt ? "text-indigo" : "text-slate-light"}>
                      {asset.managementApprovedAt ? "✓ Management approved" : "Not approved"}
                    </span>
                    <span className="text-slate-light">Status: {asset.status}</span>
                  </div>
                  {asset.employeeDisagreesNote && (
                    <p className="rounded-btn border border-orange/30 bg-orange/5 px-2 py-1.5 text-xs text-orange">
                      Employee flagged: {asset.employeeDisagreesNote}
                    </p>
                  )}
                  <div className="flex gap-3">
                    {!asset.verifiedAt && (
                      <form action={verifyWithIds}>
                        <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">Mark verified</button>
                      </form>
                    )}
                    {!asset.managementApprovedAt && (
                      <form action={approveWithIds}>
                        <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">Approve release</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
            {realAssets.length === 0 && <p className="text-sm text-slate-light">No equipment recorded yet.</p>}
          </div>

          <form action={formAction} className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-medium text-slate-light">Add equipment</p>
            <div className="grid grid-cols-2 gap-2">
              <input name="itemType" placeholder="Item type (e.g. Laptop)" required className={inputClass} />
              <input name="brand" placeholder="Brand" className={inputClass} />
              <input name="model" placeholder="Model" className={inputClass} />
              <input name="serialOrImei" placeholder="Serial / IMEI" className={inputClass} />
            </div>
            <input name="accessories" placeholder="Accessories (comma separated)" className={inputClass} />
            <textarea name="conditionNotes" placeholder="Condition notes" rows={2} className={inputClass} />
            <div>
              <label className={labelClass} htmlFor="conditionPhoto">Condition photo</label>
              <input id="conditionPhoto" name="conditionPhoto" type="file" accept="image/*" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="issueDate">Issue date</label>
              <input id="issueDate" name="issueDate" type="date" className={inputClass} />
            </div>
            {state?.error && (
              <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
            )}
            <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
              {isPending ? "Adding…" : "Add equipment"}
            </button>
          </form>

          {realAssets.length === 0 && (
            <form action={noEquipmentWithId} className="border-t border-border pt-4">
              <input type="hidden" name="reason" value="No equipment required for this role" />
              <button type="submit" className="text-xs font-medium text-slate-light hover:text-orange">
                This role needs no company equipment
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
