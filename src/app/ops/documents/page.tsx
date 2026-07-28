import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { inputClass, buttonClass } from "@/lib/form-styles";
import { markInProgress, respondToDocumentRequest } from "./actions";

export default async function OpsDocumentsPage() {
  await requireRole("MASY_OPS");

  const requests = await db.documentRequest.findMany({
    include: { employee: { include: { clientOrg: true } } },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Documents & letters</h1>
        <p className="text-sm text-slate">Employment letters, references, and other requests staff have sent in.</p>
      </div>

      <div className="space-y-4">
        {requests.map((r) => {
          const respond = respondToDocumentRequest.bind(null, r.id);
          return (
            <div key={r.id} className="rounded-card border border-border bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{r.employee.name}</p>
                  <p className="text-xs text-slate">
                    {r.employee.clientOrg.name} · {DOCUMENT_TYPE_LABELS[r.type]} · {r.requestedAt.toLocaleDateString()}
                  </p>
                </div>
                <DocumentStatusBadge status={r.status} />
              </div>

              {r.details && <p className="mt-3 text-sm text-slate">{r.details}</p>}

              {r.responseNote && (
                <div className="mt-3 rounded-btn bg-paper-2 px-3 py-2 text-sm text-ink">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-light">
                    Your response
                  </p>
                  {r.responseNote}
                </div>
              )}

              {(r.status === "REQUESTED" || r.status === "IN_PROGRESS") && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  {r.status === "REQUESTED" && (
                    <form action={markInProgress.bind(null, r.id)}>
                      <button type="submit" className="text-xs font-medium text-indigo hover:text-indigo-light">
                        Mark in progress
                      </button>
                    </form>
                  )}
                  <form action={respond} className="space-y-2">
                    <textarea
                      name="responseNote"
                      rows={2}
                      placeholder="Response note (e.g. a link to the letter, or why it's declined)"
                      required
                      className={inputClass}
                    />
                    <div className="flex gap-3">
                      <button type="submit" name="decision" value="FULFILLED" className={buttonClass}>
                        Fulfill
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="DECLINED"
                        className="rounded-btn px-4 py-2 text-sm font-medium text-slate hover:text-orange"
                      >
                        Decline
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
        {requests.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No document requests yet.
          </p>
        )}
      </div>
    </div>
  );
}
