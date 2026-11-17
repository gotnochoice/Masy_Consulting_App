import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requestIdentityDocumentDeletion } from "../../actions";

export function DataPrivacyPanel({ employeeId }: { employeeId: string }) {
  const deleteWithId = requestIdentityDocumentDeletion.bind(null, employeeId);

  return (
    <div className="space-y-3 rounded-card border border-border bg-paper p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">Data & privacy</p>
      <div className="flex flex-wrap items-center gap-4">
        <a href={`/api/employees/${employeeId}/export`} className="text-sm font-medium text-indigo hover:text-indigo-light">
          Export this employee&rsquo;s data
        </a>
        <ConfirmSubmitButton
          action={deleteWithId}
          confirmMessage="Delete this employee's identity documents (ID, NIN slip, proof of address) right now? This can't be undone, and HR will no longer be able to re-verify them."
          className="text-sm font-medium text-slate-light hover:text-orange"
        >
          Delete identity documents now
        </ConfirmSubmitButton>
      </div>
      <p className="text-xs text-slate-light">
        Identity documents are deleted automatically one year after an employee is offboarded. Use the button above only for an explicit deletion request ahead of that schedule.
      </p>
    </div>
  );
}
