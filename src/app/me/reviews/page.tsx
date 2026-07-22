import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitReview } from "./actions";

export default async function MyReviewsPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const reviews = await db.performanceReview.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Masy reviews every submission before anything reaches your employer.</p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Submit a self-assessment</h2>
        <form action={submitReview} className="space-y-4">
          <div className="max-w-xs">
            <label className={labelClass} htmlFor="cycle">Review cycle</label>
            <input id="cycle" name="cycle" placeholder="e.g. 2026-H1" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="selfAssessment">Self-assessment</label>
            <textarea id="selfAssessment" name="selfAssessment" rows={5} required className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Submit</button>
        </form>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-card border border-border bg-paper shadow-sm p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{review.cycle}</p>
              <ReviewStatusBadge status={review.status} />
            </div>
            <p className="text-sm text-slate">{review.selfAssessment}</p>
            <p className="mt-2 font-mono text-xs text-slate-light">Submitted {formatDateShort(review.createdAt)}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No reviews submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
