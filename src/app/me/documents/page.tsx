import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { EMPLOYEE_DOCUMENT_CATEGORY_LABELS } from "@/lib/employee-documents";
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

  const [requests, documents] = await Promise.all([
    db.documentRequest.findMany({
      where: { employeeId },
      orderBy: { requestedAt: "desc" },
    }),
    db.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Documents & letters</h1>
        <p className="text-sm text-slate">Files Masy HR has shared with you, and a place to request a letter.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Your documents</h2>
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-paper px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{doc.label}</p>
                  <p className="text-xs text-slate-light">
                    {EMPLOYEE_DOCUMENT_CATEGORY_LABELS[doc.category]} · {doc.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-medium text-indigo hover:text-indigo-light"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No documents shared with you yet.
          </p>
        )}
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
                <p className="text-xs text-slate-light">{r.requestedAt.toLocaleDateString()}</p>
              </div>
              <DocumentStatusBadge status={r.status} />
            </div>
            {r.details && <p className="mt-3 text-sm text-slate">{r.details}</p>}
            {r.responseNote && (
              <div className="mt-3 rounded-btn bg-paper-2 px-3 py-2 text-sm text-ink">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-light">
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
