import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { saveReviewNotes, releaseReview } from "./actions";

export default async function OpsReviewsPage() {
  await requireRole("MASY_OPS");

  const reviews = await db.performanceReview.findMany({
    include: { employee: { include: { clientOrg: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Add your notes, then release the full review to the client.</p>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => {
          const notesWithId = saveReviewNotes.bind(null, review.id);
          const releaseWithId = releaseReview.bind(null, review.id);
          return (
            <div key={review.id} className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-5">
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

              <p className="mb-4 rounded-btn bg-paper-2 p-3 text-sm text-ink">{review.selfAssessment}</p>

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
          <p className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] px-5 py-6 text-center text-sm text-slate">
            No reviews submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
