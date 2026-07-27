import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { MasyLogo } from "@/components/masy-logo";
import { PrintButton } from "@/components/print-button";

export default async function ClientReviewsPage() {
  const session = await requireRole("CLIENT");

  const reviews = await db.performanceReview.findMany({
    where: { employee: scopedEmployeeWhere(session), status: "RELEASED" },
    include: { employee: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Reviewed and released by your Masy HR contact.</p>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => {
          const paragraphs = (review.masyNotes ?? "").split(/\n+/).filter((p) => p.trim().length > 0);
          return (
            <article
              key={review.id}
              className="overflow-hidden rounded-card border border-border bg-paper shadow-sm print:break-inside-avoid print:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-paper-2 px-6 py-4">
                <div>
                  <MasyLogo className="text-sm" />
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-light">
                    Performance review report
                  </p>
                </div>
                <PrintButton />
              </div>

              <div className="px-6 py-6">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-5">
                  <div>
                    <p className="text-lg font-bold text-ink">{review.employee.name}</p>
                    <p className="text-sm text-slate">{review.employee.roleTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase tracking-wide text-slate-light">Review cycle</p>
                    <p className="text-sm font-medium text-ink">{review.cycle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-ink">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-slate-light">No summary written yet.</p>
                  )}
                </div>

                <p className="mt-6 border-t border-border pt-4 font-mono text-xs text-slate-light">
                  Prepared by your Masy Consulting HR partner · Released {formatDateShort(review.updatedAt)}
                </p>
              </div>
            </article>
          );
        })}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No reviews released yet.
          </p>
        )}
      </div>
    </div>
  );
}
