import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { inputClass } from "@/lib/form-styles";
import { addGuarantorVerificationLog, requestGuarantorReplacement } from "./actions";
import type { Guarantor, GuarantorVerificationLog } from "@/generated/prisma/client";

export function GuarantorVerification({ guarantors }: { guarantors: (Guarantor & { verificationLogs: GuarantorVerificationLog[] })[] }) {
  return (
    <div className="space-y-3">
      {guarantors.map((g) => {
        const addLogWithId = addGuarantorVerificationLog.bind(null, g.id);
        const replaceWithId = requestGuarantorReplacement.bind(null, g.id);
        const lastLog = g.verificationLogs[g.verificationLogs.length - 1];
        return (
          <div key={g.id} className="space-y-2 rounded-btn border border-border p-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{g.name} -- {g.relationship}</p>
              {lastLog?.result === "VERIFIED" ? (
                <span className="text-indigo">✓ Verified</span>
              ) : (
                <ConfirmSubmitButton
                  action={replaceWithId}
                  confirmMessage={`Ask the employee to replace ${g.name}? They'll get a 7 day countdown.`}
                  className="font-medium text-orange hover:text-orange/80"
                >
                  Request replacement
                </ConfirmSubmitButton>
              )}
            </div>
            <p className="text-slate-light">{g.phone} · {g.email}</p>
            <form action={addLogWithId} className="flex flex-wrap items-center gap-2">
              <select name="method" required className={`${inputClass} w-auto`}>
                <option value="">Method</option>
                <option value="PHONE_CALL">Phone call</option>
                <option value="EMAIL">Email</option>
                <option value="OTHER">Other</option>
              </select>
              <select name="result" required className={`${inputClass} w-auto`}>
                <option value="">Result</option>
                <option value="VERIFIED">Verified</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
              <label className="flex items-center gap-1">
                <input type="checkbox" name="followUpNeeded" /> Follow-up needed
              </label>
              <input name="notes" placeholder="Notes" className={`${inputClass} w-auto flex-1`} />
              <button type="submit" className="font-medium text-indigo hover:text-indigo-light">Log</button>
            </form>
            {g.verificationLogs.length > 0 && (
              <ul className="space-y-0.5 text-slate-light">
                {g.verificationLogs.map((l) => (
                  <li key={l.id}>{l.verifiedAt.toLocaleDateString()} -- {l.method} -- {l.result}{l.followUpNeeded ? " (follow-up needed)" : ""}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
