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

  // True only once a real Paystack response has confirmed the name -- never set for the
  // manual-entry fallback below, so HR can tell the two apart (see submitPersonalDetails,
  // which always flags a manually-entered account for review).
  const [machineVerified, setMachineVerified] = useState(false);

  const [lastSeenState, setLastSeenState] = useState(state);
  if (state !== lastSeenState) {
    setLastSeenState(state);
    if (state && "accountName" in state) {
      setConfirmedName(state.accountName);
      setConfirmedBankName(banks.find((b) => b.code === bankCode)?.name ?? confirmedBankName);
      setMachineVerified(true);
    }
  }

  // Bank verification isn't configured (no PAYSTACK_SECRET_KEY) -- banksError is set and the
  // bank list is empty. Onboarding can't be blocked on an integration that isn't live, so fall
  // back to letting the employee type their own bank name and account holder name; HR sees this
  // wasn't machine-verified (bankNameMatchStatus only ever gets set from a real Paystack match)
  // and can confirm it manually.
  const verificationAvailable = banks.length > 0;

  return (
    <div className="space-y-3 rounded-btn border border-border p-4">
      <p className="text-xs font-medium text-slate-light">Bank details</p>
      {banksError && (
        <p className="rounded-btn border border-border bg-paper-2 px-3.5 py-2.5 text-sm text-slate">
          Enter your bank details below. We&rsquo;ll confirm the account before your first payment.
        </p>
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
              if (verificationAvailable) {
                setConfirmedName("");
                setConfirmIsMine(false);
                setMachineVerified(false);
              }
            }}
            required
            maxLength={10}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="bankCode">Bank</label>
          {verificationAvailable ? (
            <select
              id="bankCode"
              name="bankCode"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setConfirmedName("");
                setConfirmIsMine(false);
                setMachineVerified(false);
              }}
              className={inputClass}
            >
              <option value="">Select bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          ) : (
            <input
              id="bankNameManual"
              value={confirmedBankName}
              onChange={(e) => setConfirmedBankName(e.target.value)}
              required
              placeholder="e.g. GTBank"
              className={inputClass}
            />
          )}
        </div>
      </div>

      {verificationAvailable && (
        <>
          {/* Same form as the page's main submit, not a nested <form> (forms can't nest in HTML)
              -- the parent's onSubmit routes to the right action by which button was clicked. */}
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
        </>
      )}

      {!verificationAvailable && (
        <div>
          <label className={labelClass} htmlFor="accountHolderNameManual">Account holder name</label>
          <input
            id="accountHolderNameManual"
            value={confirmedName}
            onChange={(e) => setConfirmedName(e.target.value)}
            required
            placeholder="Name on the account"
            className={inputClass}
          />
        </div>
      )}

      <input type="hidden" name="bankName" value={confirmedBankName} />
      <input type="hidden" name="bankAccountHolderName" value={confirmedName} />
      <input type="hidden" name="bankMachineVerified" value={machineVerified ? "on" : ""} />

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
