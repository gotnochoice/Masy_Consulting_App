import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { SuccessBanner } from "@/components/success-banner";
import { requestDocument } from "./actions";

export default async function MyDocumentsPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const requests = await db.documentRequest.findMany({
    where: { employeeId },
    orderBy: { requestedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Documents & letters</h1>
        <p className="text-sm text-slate">Request a letter from Masy HR, and track it through to delivery.</p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <SuccessBanner />
        <h2 className="mb-4 text-sm font-semibold text-ink">Request a document</h2>
        <form action={requestDocument} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="type">Document type</label>
            <select id="type" name="type" required defaultValue="EMPLOYMENT_VERIFICATION" className={inputClass}>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="details">
              Details <span className="font-normal text-slate-light">(what it&apos;s for, deadline, etc.)</span>
            </label>
            <textarea id="details" name="details" rows={2} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Submit request</button>
        </form>
      </div>

      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="rounded-card border border-border bg-paper p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">{DOCUMENT_TYPE_LABELS[r.type]}</p>
                <p className="font-mono text-xs text-slate-light">{r.requestedAt.toLocaleDateString()}</p>
              </div>
              <DocumentStatusBadge status={r.status} />
            </div>
            {r.details && <p className="mt-3 text-sm text-slate">{r.details}</p>}
            {r.responseNote && (
              <div className="mt-3 rounded-btn bg-paper-2 px-3 py-2 text-sm text-ink">
                <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-light">
                  From Masy HR
                </p>
                {r.responseNote}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No document requests yet.
          </p>
        )}
      </div>
    </div>
  );
}
