import { EMPLOYEE_DOCUMENT_CATEGORY_LABELS } from "@/lib/employee-documents";
import type { EmployeeDocument } from "@/generated/prisma/client";

export function DocumentList({ documents }: { documents: EmployeeDocument[] }) {
  return (
    <div className="space-y-4 rounded-card border border-border bg-paper p-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Documents</h2>
        <p className="text-xs text-slate-light">Employment letters, onboarding paperwork, and other files Masy has on file.</p>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-btn border border-border px-3 py-2"
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
        <p className="text-sm text-slate-light">No documents on file yet.</p>
      )}
    </div>
  );
}
