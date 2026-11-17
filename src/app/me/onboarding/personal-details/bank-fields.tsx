"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";
import type { VerifyBankState } from "./actions";
import type { NigerianBank } from "@/lib/bank-verification";

export function BankFields({
  banks,
  banksError,
  initialAccountNumber,
  initialBankName,
  initialAccountHolderName,
  state,
  isPending,
}: {
  banks: NigerianBank[];
  banksError: string | null;
  initialAccountNumber: string | null;
  initialBankName: string | null;
  initialAccountHolderName: string | null;
  state: VerifyBankState;
  isPending: boolean;
}) {
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber ?? "");
  const [bankCode, setBankCode] = useState("");
  const [confirmedName, setConfirmedName] = useState(initialAccountHolderName ?? "");
  const [confirmedBankName, setConfirmedBankName] = useState(initialBankName ?? "");
  // Controlled, not uncontrolled: React resets uncontrolled form fields when a form action
  // completes, even on a validation error, which otherwise wipes this checkbox on a failed retry.
  const [confirmIsMine, setConfirmIsMine] = useState(false);

  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (state && "accountName" in state) {
      setConfirmedName(state.accountName);
      setConfirmedBankName(banks.find((b) => b.code === bankCode)?.name ?? confirmedBankName);
    }
  }

  return (
    <div className="space-y-3 rounded-btn border border-border p-4">
      <p className="text-xs font-medium text-slate-light">Bank details</p>
      {banksError && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{banksError}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="bankAccountNumber">Account number</label>
          <input
            id="bankAccountNumber"
            name="bankAccountNumber"
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value);
              setConfirmedName("");
              setConfirmIsMine(false);
            }}
            required
            maxLength={10}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="bankCode">Bank</label>
          <select
            id="bankCode"
            name="bankCode"
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
              setConfirmedName("");
              setConfirmIsMine(false);
            }}
            disabled={banks.length === 0}
            className={inputClass}
          >
            <option value="">Select bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Same form as the page's main submit, not a nested <form> (forms can't nest in HTML) --
          the parent's onSubmit routes to the right action by which button was clicked. */}
      <button
        type="submit"
        data-submit="verify"
        disabled={isPending || !accountNumber || !bankCode}
        className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint disabled:opacity-50"
      >
        {isPending ? "Verifying…" : "Verify account"}
      </button>
      {state && "error" in state && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}

      {confirmedName && (
        <div className="rounded-btn bg-indigo-tint px-3.5 py-2.5 text-sm text-indigo">
          Account name: <strong>{confirmedName}</strong>
        </div>
      )}

      <input type="hidden" name="bankName" value={confirmedBankName} />
      <input type="hidden" name="bankAccountHolderName" value={confirmedName} />

      <label className="flex items-start gap-2 text-sm text-slate">
        <input
          type="checkbox"
          name="confirmBankAccountIsMine"
          checked={confirmIsMine}
          onChange={(e) => setConfirmIsMine(e.target.checked)}
          required
          disabled={!confirmedName}
          className="mt-0.5"
        />
        This account is mine.
      </label>
    </div>
  );
}
