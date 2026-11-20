import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requestIdentityDocumentDeletion } from "../../actions";
import { regenerateOnboardingRecord } from "@/app/ops/onboarding/actions";

export function DataPrivacyPanel({
  employeeId,
  latestOnboardingRecord,
}: {
  employeeId: string;
  latestOnboardingRecord: { id: string; version: number; fileUrl: string | null } | null;
}) {
  const deleteWithId = requestIdentityDocumentDeletion.bind(null, employeeId);
  const regenerateWithId = regenerateOnboardingRecord.bind(null, employeeId);

  return (
    <div className="space-y-3 rounded-card border border-border bg-paper p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">Data & privacy</p>
      <div className="flex flex-wrap items-center gap-4">
        <a href={`/api/employees/${employeeId}/export`} className="text-sm font-medium text-indigo hover:text-indigo-light">
          Export this employee&rsquo;s data
        </a>
        {latestOnboardingRecord?.fileUrl && (
          <a
            href={`/api/onboarding-records/${latestOnboardingRecord.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-indigo hover:text-indigo-light"
          >
            Onboarding record (v{latestOnboardingRecord.version})
          </a>
        )}
        {latestOnboardingRecord && !latestOnboardingRecord.fileUrl && (
          <form action={regenerateWithId}>
            <button type="submit" className="text-sm font-medium text-orange hover:text-orange/80">
              Onboarding record failed to generate -- retry
            </button>
          </form>
        )}
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
