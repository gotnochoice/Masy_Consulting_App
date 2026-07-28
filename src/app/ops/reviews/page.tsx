import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { saveReviewNotes, releaseReview } from "./actions";

type ReviewResponseSection = { section: string; answers: { question: string; answer: string }[] };

export default async function OpsReviewsPage() {
  await requireRole("MASY_OPS");

  const reviews = await db.performanceReview.findMany({
    include: { employee: { include: { clientOrg: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Add your notes, then release the full review to the client.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => {
          const notesWithId = saveReviewNotes.bind(null, review.id);
          const releaseWithId = releaseReview.bind(null, review.id);
          const responses = Array.isArray(review.responses)
            ? (review.responses as unknown as ReviewResponseSection[])
            : [];
          return (
            <div key={review.id} className="rounded-card border border-border bg-paper p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {review.employee.name}{" "}
                    <span className="font-normal text-slate">· {review.employee.clientOrg.name} · {review.cycle}</span>
                  </p>
                  <p className="font-mono text-xs text-slate-light">Submitted {formatDateShort(review.createdAt)}</p>
                </div>
                <ReviewStatusBadge status={review.status} />
              </div>

              {responses.length > 0 && (
                <details className="group mb-4 rounded-btn bg-paper-2">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-slate hover:text-ink">
                    View self-assessment ({responses.length} section{responses.length === 1 ? "" : "s"})
                  </summary>
                  <div className="space-y-3 border-t border-border p-3">
                    {responses.map((s, si) => (
                      <div key={si}>
                        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-indigo">{s.section}</p>
                        <div className="mt-1 space-y-2">
                          {s.answers.map((a, ai) => (
                            <div key={ai}>
                              <p className="font-mono text-xs font-medium uppercase tracking-wide text-slate-light">
                                {a.question}
                              </p>
                              <p className="text-sm text-ink">{a.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              {review.selfAssessment && (
                <p className="mb-4 rounded-btn bg-paper-2 p-3 text-sm text-ink">{review.selfAssessment}</p>
              )}

              <form action={notesWithId} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor={`notes-${review.id}`}>Masy notes</label>
                  <textarea
                    id={`notes-${review.id}`}
                    name="masyNotes"
                    rows={3}
                    defaultValue={review.masyNotes ?? ""}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" className={buttonClass}>Save</button>
                  {review.status !== "RELEASED" && (
                    <span className="text-xs text-slate-light">Save notes, then release separately below.</span>
                  )}
                </div>
              </form>

              {review.status !== "RELEASED" && (
                <form action={releaseWithId} className="mt-3">
                  <button
                    type="submit"
                    className="rounded-btn bg-indigo-tint px-3 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo hover:text-white"
                  >
                    Release to client
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper px-5 py-8 text-center text-sm text-slate-light">
            No reviews submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
