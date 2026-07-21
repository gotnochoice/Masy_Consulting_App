import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/leave";
import { ConcernVisibilityBadge } from "@/components/concern-visibility-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { curateConcern, releaseToClient } from "./actions";

export default async function OpsConcernsPage() {
  await requireRole("MASY_OPS");

  const concerns = await db.concern.findMany({
    include: { employee: { include: { clientOrg: true } } },
    orderBy: [{ visibility: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">Concerns</h1>
        <p className="text-sm text-slate">
          Raw submissions stay here. Write a curated summary before releasing anything to a client — never the
          raw text, never identifying detail unless necessary.
        </p>
      </div>

      <div className="space-y-4">
        {concerns.map((concern) => {
          const curateWithId = curateConcern.bind(null, concern.id);
          const releaseWithId = releaseToClient.bind(null, concern.id);
          return (
            <div key={concern.id} className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {concern.employee.name} <span className="font-normal text-slate">· {concern.employee.clientOrg.name}</span>
                  </p>
                  <p className="font-mono text-xs text-slate-light">{formatDateShort(concern.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {concern.escalated && (
                    <span className="rounded-btn bg-orange-light/40 px-2.5 py-0.5 font-mono text-xs font-medium text-orange">
                      Escalated
                    </span>
                  )}
                  <ConcernVisibilityBadge visibility={concern.visibility} />
                </div>
              </div>

              <p className="mb-4 rounded-btn bg-paper-2 p-3 text-sm text-ink">{concern.content}</p>

              <form action={curateWithId} className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor={`summary-${concern.id}`}>Curated summary (Masy notes)</label>
                  <textarea
                    id={`summary-${concern.id}`}
                    name="curatedSummary"
                    rows={2}
                    defaultValue={concern.curatedSummary ?? ""}
                    className={inputClass}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate">
                  <input type="checkbox" name="escalated" defaultChecked={concern.escalated} className="rounded border-border" />
                  Escalated
                </label>
                <div className="flex items-center gap-3">
                  <button type="submit" className={buttonClass}>Save</button>
                  {concern.visibility !== "CLIENT_VISIBLE" && (
                    <span className="text-xs text-slate-light">Save a summary, then release separately below.</span>
                  )}
                </div>
              </form>

              {concern.visibility !== "CLIENT_VISIBLE" && (
                <form action={releaseWithId} className="mt-3">
                  <button
                    type="submit"
                    className="rounded-btn bg-indigo-tint px-3 py-1.5 text-xs font-semibold text-indigo hover:bg-indigo hover:text-white"
                  >
                    Release summary to client
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {concerns.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] px-5 py-6 text-center text-sm text-slate">
            No concerns submitted yet.
          </p>
        )}
      </div>
    </div>
  );
}
