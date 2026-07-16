import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitConcern } from "./actions";

export default async function MyConcernsPage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const concerns = await db.concern.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Concerns</h1>
        <p className="text-sm text-slate">
          This goes to your Masy HR contact only — never directly to your employer. Masy decides what, if
          anything, gets shared, and never with your name attached unless it&apos;s necessary.
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Raise a concern</h2>
        <form action={submitConcern} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="content">What&apos;s going on?</label>
            <textarea id="content" name="content" rows={4} required className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Submit</button>
        </form>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-paper">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-paper-2">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Submitted</th>
              <th className="px-4 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wide text-slate-light">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {concerns.map((concern) => (
              <tr key={concern.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate">
                  {formatDateShort(concern.createdAt)}
                </td>
                <td className="px-4 py-3 text-ink">{concern.content}</td>
              </tr>
            ))}
            {concerns.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate">Nothing submitted yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
