import { requireRole, scopedEmployeeWhere } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";

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
        <h1 className="text-2xl font-bold text-ink">Performance reviews</h1>
        <p className="text-sm text-slate">Reviewed and released by your Masy HR contact.</p>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-card border border-border bg-paper shadow-sm p-5">
            <p className="mb-2 text-sm font-medium text-ink">
              {review.employee.name} <span className="font-normal text-slate">· {review.cycle}</span>
            </p>
            <p className="text-sm text-slate">{review.masyNotes}</p>
            <p className="mt-2 font-mono text-xs text-slate-light">Updated {formatDateShort(review.updatedAt)}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No reviews released yet.
          </p>
        )}
      </div>
    </div>
  );
}
