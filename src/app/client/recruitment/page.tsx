import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { RoleStageBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { ClientCandidateCard } from "./candidate-card";
import { updateCandidateStage } from "./actions";

export default async function ClientRecruitmentPage() {
  const session = await requireRole("CLIENT");

  const roles = await db.openRole.findMany({
    where: { clientOrgId: session.user.clientOrgId ?? "__none__" },
    orderBy: { createdAt: "desc" },
    include: {
      candidates: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          yearsExperience: true,
          location: true,
          resumeLink: true,
          resumeFileUrl: true,
          workSampleUrl: true,
          expectedPay: true,
          howHeard: true,
          followedSocials: true,
          stage: true,
          source: true,
          answers: { include: { roleQuestion: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Recruitment</h1>
        <p className="text-sm text-slate">Who&rsquo;s applying for your open roles, and where they are in the pipeline.</p>
      </div>

      {roles.length === 0 && (
        <div className="rounded-card border border-border bg-paper px-4 py-8 text-center text-sm text-slate-light">
          No open roles yet. Masy will set these up as you hire.
        </div>
      )}

      {roles.map((role) => {
        const candidatesWithCvUrl = role.candidates
          .map((c) => ({ ...c, cvUrl: c.resumeFileUrl ?? c.resumeLink }))
          .sort((a, b) => CANDIDATE_STAGE_ORDER.indexOf(a.stage) - CANDIDATE_STAGE_ORDER.indexOf(b.stage));
        const stageCounts = CANDIDATE_STAGE_ORDER.map((stage) => ({
          stage,
          count: candidatesWithCvUrl.filter((c) => c.stage === stage).length,
        })).filter(({ count }) => count > 0);

        return (
          <div key={role.id} className="space-y-4 rounded-card border border-border bg-paper p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-ink">{role.title}</p>
                <p className="text-xs text-slate-light">
                  {role.candidates.length} candidate{role.candidates.length === 1 ? "" : "s"}
                  {role.acceptingApplications ? " · accepting applications" : " · applications closed"}
                  {role.location && ` · ${role.location}`}
                </p>
              </div>
              <RoleStageBadge stage={role.stage} />
            </div>

            {stageCounts.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-4 text-xs text-slate">
                {stageCounts.map(({ stage, count }) => (
                  <span key={stage}>
                    {CANDIDATE_STAGE_LABELS[stage]} <span className="font-medium text-ink">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {candidatesWithCvUrl.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {candidatesWithCvUrl.map((candidate) => {
                  const updateStageWithId = updateCandidateStage.bind(null, candidate.id);
                  return (
                    <ClientCandidateCard key={candidate.id} candidate={candidate} updateStage={updateStageWithId} />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-light">No applicants yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
