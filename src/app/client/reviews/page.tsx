import { CheckCircle2 } from "lucide-react";
import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { MasyLogo } from "@/components/masy-logo";
import { PrintButton } from "@/components/print-button";
import { acknowledgeReview } from "@/lib/actions/reviews";

type ReviewResponseSection = { section: string; answers: { question: string; answer: string }[] };

export default async function ClientReviewsPage() {
  const session = await requireRole("CLIENT");

  const reviews = await db.performanceReview.findMany({
    where: { employee: scopedEmployeeWhere(session), status: "RELEASED" },
    include: { employee: true, acks: { where: { userId: session.user.id } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Reviewed and released by your Masy HR contact.</p>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => {
          const notes = (review.masyNotes ?? "").split(/\n+/).filter((p) => p.trim().length > 0);
          const responses = Array.isArray(review.responses)
            ? (review.responses as unknown as ReviewResponseSection[])
            : [];
          const resolved = review.acks.length > 0;
          return (
            <article
              key={review.id}
              id={`review-${review.id}`}
              className="scroll-mt-4 overflow-hidden rounded-card border border-border bg-paper print:break-inside-avoid print:shadow-none"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-paper-2 px-6 py-4">
                <div>
                  <MasyLogo className="text-sm" />
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-light">
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
                    <p className="text-xs uppercase tracking-wide text-slate-light">Review cycle</p>
                    <p className="text-sm font-medium text-ink">{review.cycle}</p>
                  </div>
                </div>

                {notes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
                      Summary from your Masy HR partner
                    </p>
                    {notes.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-ink">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {responses.length > 0 && (
                  <div className={`space-y-5 ${notes.length > 0 ? "mt-6 border-t border-border pt-5" : ""}`}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
                      {review.employee.name}&rsquo;s self-assessment
                    </p>
                    {responses.map((s, si) => (
                      <div key={si}>
                        <p className="text-sm font-semibold text-ink">{s.section}</p>
                        <div className="mt-2 space-y-3">
                          {s.answers.map((a, ai) => (
                            <div key={ai}>
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                                {a.question}
                              </p>
                              <p className="mt-0.5 text-sm leading-relaxed text-ink">{a.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {review.selfAssessment && (
                  <div className={`${notes.length > 0 || responses.length > 0 ? "mt-6 border-t border-border pt-5" : ""}`}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">Anything else</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink">{review.selfAssessment}</p>
                  </div>
                )}

                {notes.length === 0 && responses.length === 0 && !review.selfAssessment && (
                  <p className="text-sm text-slate-light">No content submitted for this review.</p>
                )}

                <p className="mt-6 border-t border-border pt-4 text-xs text-slate-light">
                  Prepared by your Masy Consulting HR partner · Released {formatDateShort(review.updatedAt)}
                </p>

                <div className="mt-4 border-t border-border pt-4 print:hidden">
                  {resolved ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-indigo">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Marked as resolved
                    </p>
                  ) : (
                    <form action={acknowledgeReview.bind(null, review.id)}>
                      <button
                        type="submit"
                        className="rounded-btn bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-light"
                      >
                        Mark as resolved
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No reviews released yet.
          </p>
        )}
      </div>
    </div>
  );
}
