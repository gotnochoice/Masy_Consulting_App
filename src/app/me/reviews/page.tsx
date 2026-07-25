import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { getReviewQuestions } from "@/lib/review-questions";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitReview } from "./actions";

const sectionLabelClass = "font-mono text-xs font-semibold uppercase tracking-widest text-slate-light";

type ReviewResponse = { question: string; answer: string };

export default async function MyReviewsPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const [employee, reviews] = await Promise.all([
    db.employee.findUnique({ where: { id: employeeId } }),
    db.performanceReview.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!employee) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const questions = await getReviewQuestions(employeeId, employee.roleTitle, employee.reviewQuestions);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Masy reviews every submission before anything reaches your employer.</p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">Submit a self-assessment</h2>
        <p className="mb-4 text-xs text-slate-light">Tailored to your role as {employee.roleTitle}.</p>
        <form action={submitReview} className="space-y-6">
          <div className="max-w-xs">
            <label className={labelClass} htmlFor="cycle">Review cycle</label>
            <input id="cycle" name="cycle" placeholder="e.g. 2026-H1" required className={inputClass} />
          </div>

          <div className="space-y-4">
            {questions.map((question, i) => (
              <div key={i}>
                <p className={sectionLabelClass}>{String(i + 1).padStart(2, "0")}</p>
                <label className={labelClass} htmlFor={`q_${i}`}>{question}</label>
                <textarea id={`q_${i}`} name={`q_${i}`} rows={3} required className={inputClass} />
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <label className={labelClass} htmlFor="selfAssessment">Anything else you&apos;d like to add? (optional)</label>
            <textarea id="selfAssessment" name="selfAssessment" rows={3} className={inputClass} />
          </div>

          <button type="submit" className={buttonClass}>Submit</button>
        </form>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => {
          const responses = Array.isArray(review.responses) ? (review.responses as unknown as ReviewResponse[]) : [];
          return (
            <div key={review.id} className="rounded-card border border-border bg-paper shadow-sm p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{review.cycle}</p>
                <ReviewStatusBadge status={review.status} />
              </div>
              {responses.length > 0 && (
                <div className="space-y-2">
                  {responses.map((r, i) => (
                    <div key={i}>
                      <p className="text-xs font-medium text-slate-light">{r.question}</p>
                      <p className="text-sm text-ink">{r.answer}</p>
                    </div>
                  ))}
                </div>
              )}
              {review.selfAssessment && (
                <p className="mt-2 text-sm text-slate">{review.selfAssessment}</p>
              )}
              <p className="mt-2 font-mono text-xs text-slate-light">Submitted {formatDateShort(review.createdAt)}</p>
            </div>
          );
        })}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No reviews submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
