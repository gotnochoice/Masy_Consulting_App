import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { PULSE_SCORE_LABELS } from "@/lib/pulse";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { submitPulseCheckIn } from "./actions";

export default async function MyPulsePage() {
  const session = await requireRole("EMPLOYEE");
  const employeeId = session.user.employeeId;

  if (!employeeId) {
    return <p className="text-sm text-slate">No profile found yet. Contact your Masy HR contact.</p>;
  }

  const checkIns = await db.pulseCheckIn.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pulse check-in</h1>
        <p className="text-sm text-slate">
          A quick, private read on how work is going. Masy sees this to spot patterns early — your employer only
          ever sees an aggregate trend, never your individual answers.
        </p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <form action={submitPulseCheckIn} className="space-y-4">
          <div>
            <label className={labelClass}>How are you feeling about work right now?</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-btn border border-border px-4 py-2 text-xs text-slate has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:checked]:text-indigo"
                >
                  <input type="radio" name="score" value={n} required className="sr-only" />
                  <span className="text-lg font-bold">{n}</span>
                  {PULSE_SCORE_LABELS[n]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="comment">Anything you want to add? (optional)</label>
            <textarea id="comment" name="comment" rows={3} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Submit check-in</button>
        </form>
      </div>

      <div className="space-y-3">
        {checkIns.map((c) => (
          <div key={c.id} className="rounded-card border border-border bg-paper shadow-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                {c.score}/5 — {PULSE_SCORE_LABELS[c.score]}
              </p>
              <p className="font-mono text-xs text-slate-light">{formatDateShort(c.createdAt)}</p>
            </div>
            {c.comment && <p className="mt-1 text-sm text-slate">{c.comment}</p>}
          </div>
        ))}
        {checkIns.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No check-ins yet.
          </p>
        )}
      </div>
    </div>
  );
}
