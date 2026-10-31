import { CheckCircle2 } from "lucide-react";
import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { EMPLOYEE_DOCUMENT_CATEGORY_LABELS } from "@/lib/employee-documents";
import { acknowledgeEmployeeDocument } from "@/lib/actions/employee-documents";

export default async function ClientDocumentsPage() {
  const session = await requireRole("CLIENT");

  const documents = await db.employeeDocument.findMany({
    where: { employee: scopedEmployeeWhere(session) },
    include: { employee: true, acks: { where: { userId: session.user.id } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Documents</h1>
        <p className="text-sm text-slate">Every document Masy has shared for your team, across all your staff.</p>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const seen = doc.acks.length > 0;
          return (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-paper px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{doc.label}</p>
                <p className="text-xs text-slate-light">
                  {doc.employee.name} · {EMPLOYEE_DOCUMENT_CATEGORY_LABELS[doc.category]} · {doc.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-indigo hover:text-indigo-light"
                >
                  View
                </a>
                {seen ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-light">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Seen
                  </span>
                ) : (
                  <form action={acknowledgeEmployeeDocument.bind(null, doc.id)}>
                    <button
                      type="submit"
                      className="rounded-btn bg-indigo px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-light"
                    >
                      Mark as seen
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No documents shared with your team yet.
          </p>
        )}
      </div>
    </div>
  );
}
