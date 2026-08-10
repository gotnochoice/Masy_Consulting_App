import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { RoleStageBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { ClientCandidateCard } from "./candidate-card";

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
          resumeLink: true,
          resumeFileUrl: true,
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
        const candidatesWithCvUrl = role.candidates.map((c) => ({ ...c, cvUrl: c.resumeFileUrl ?? c.resumeLink }));
        const columns = CANDIDATE_STAGE_ORDER.map((stage) => ({
          stage,
          candidates: candidatesWithCvUrl.filter((c) => c.stage === stage),
        }));

        return (
          <div key={role.id} className="space-y-4 rounded-card border border-border bg-paper p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-ink">{role.title}</p>
                <p className="text-xs text-slate-light">
                  {role.candidates.length} candidate{role.candidates.length === 1 ? "" : "s"}
                  {role.acceptingApplications ? " · accepting applications" : " · applications closed"}
                </p>
              </div>
              <RoleStageBadge stage={role.stage} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {columns.map(({ stage, candidates }) => (
                <div key={stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                      {CANDIDATE_STAGE_LABELS[stage]}
                    </p>
                    <span className="text-xs text-slate-light">{candidates.length}</span>
                  </div>
                  <div className="space-y-3">
                    {candidates.map((candidate) => (
                      <ClientCandidateCard key={candidate.id} candidate={candidate} />
                    ))}
                    {candidates.length === 0 && (
                      <p className="rounded-card border border-dashed border-border px-3 py-4 text-center text-xs text-slate-light">
                        None
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
