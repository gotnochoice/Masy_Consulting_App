import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CandidateStageBadge } from "@/components/stage-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { updateRoleStage, addCandidate, updateCandidateStage } from "../actions";

const ROLE_STAGE_OPTIONS = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFER", label: "Offer" },
  { value: "FILLED", label: "Filled" },
];

const CANDIDATE_STAGE_OPTIONS = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFER", label: "Offer" },
  { value: "FILLED", label: "Filled" },
  { value: "REJECTED", label: "Rejected" },
];

export default async function RolePipelinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const role = await db.openRole.findUnique({
    where: { id },
    include: {
      clientOrg: true,
      candidates: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!role) notFound();

  const updateRoleStageWithId = updateRoleStage.bind(null, role.id);
  const addCandidateWithId = addCandidate.bind(null, role.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">{role.title}</h1>
        <p className="text-sm text-slate">{role.clientOrg.name}</p>
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-5">
        <form action={updateRoleStageWithId} className="flex items-end gap-3">
          <div>
            <label className={labelClass} htmlFor="stage">Role stage</label>
            <select id="stage" name="stage" defaultValue={role.stage} className={inputClass}>
              {ROLE_STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Update</button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">Candidates</h2>
        {role.candidates.map((candidate) => {
          const updateStageWithIds = updateCandidateStage.bind(null, candidate.id, role.id);
          return (
            <div key={candidate.id} className="rounded-card border border-border bg-paper shadow-sm p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{candidate.name}</p>
                <CandidateStageBadge stage={candidate.stage} />
              </div>
              {candidate.notes && <p className="mb-3 text-sm text-slate">{candidate.notes}</p>}
              <form action={updateStageWithIds} className="flex items-end gap-3">
                <select name="stage" defaultValue={candidate.stage} className={`${inputClass} max-w-xs`}>
                  {CANDIDATE_STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-btn border border-border px-3 py-2 text-sm font-medium text-slate hover:text-ink">
                  Move stage
                </button>
              </form>
            </div>
          );
        })}
        {role.candidates.length === 0 && (
          <p className="rounded-card border border-border bg-paper shadow-sm px-5 py-6 text-center text-sm text-slate">
            No candidates yet.
          </p>
        )}
      </div>

      <div className="rounded-card border border-border bg-paper shadow-sm p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add candidate</h2>
        <form action={addCandidateWithId} className="space-y-4">
          <div className="max-w-sm">
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="notes">Interview notes (optional)</label>
            <textarea id="notes" name="notes" rows={2} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Add candidate</button>
        </form>
      </div>
    </div>
  );
}
