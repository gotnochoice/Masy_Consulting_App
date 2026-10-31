import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { getReviewTemplate } from "@/lib/review-templates";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { SuccessBanner } from "@/components/success-banner";
import { ReviewForm } from "./review-form";

const sectionLabelClass = "text-xs font-semibold uppercase tracking-widest text-slate-light";

type ReviewResponseSection = { section: string; answers: { question: string; answer: string }[] };

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

  const template = await getReviewTemplate(employeeId, employee.roleTitle, employee.reviewTemplate);

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Masy reviews every submission before anything reaches your employer.</p>
      </div>

      <SuccessBanner />
      <ReviewForm roleTitle={employee.roleTitle} template={template} />

      <div className="space-y-3">
        {reviews.map((review) => {
          const responses = Array.isArray(review.responses)
            ? (review.responses as unknown as ReviewResponseSection[])
            : [];
          return (
            <div key={review.id} className="rounded-card border border-border bg-paper p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{review.cycle}</p>
                <ReviewStatusBadge status={review.status} />
              </div>
              {responses.length > 0 && (
                <div className="space-y-3">
                  {responses.map((s, si) => (
                    <div key={si}>
                      <p className={sectionLabelClass}>{s.section}</p>
                      <div className="mt-1 space-y-2">
                        {s.answers.map((a, ai) => (
                          <div key={ai}>
                            <p className="text-xs font-medium text-slate-light">{a.question}</p>
                            <p className="text-sm text-ink">{a.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {review.selfAssessment && (
                <p className="mt-2 text-sm text-slate">{review.selfAssessment}</p>
              )}
              <p className="mt-2 text-xs text-slate-light">Submitted {formatDateShort(review.createdAt)}</p>
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
