import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { CandidateSourceBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { formatDateShort } from "@/lib/leave";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { updateCandidateStage } from "../../recruitment/actions";
import { deleteCandidateAndRedirect } from "../actions";

export default async function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const candidate = await db.candidate.findUnique({
    where: { id },
    include: {
      openRole: { include: { clientOrg: true } },
      answers: { include: { roleQuestion: true } },
    },
  });
  if (!candidate) notFound();

  const cvUrl = candidate.resumeFileUrl ?? candidate.resumeLink;
  const updateStageWithIds = updateCandidateStage.bind(null, candidate.id, candidate.openRoleId);
  const deleteWithIds = deleteCandidateAndRedirect.bind(null, candidate.id, candidate.openRoleId);
  const hasMoreDetails = candidate.howHeard || candidate.answers.length > 0 || candidate.notes;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/ops/applicants" className="text-xs font-medium text-slate hover:text-ink">
          ← All applicants
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
            <h1 className="text-2xl font-bold tracking-tight text-ink">{candidate.name}</h1>
            <p className="text-sm text-slate">
              Applied for{" "}
              <Link
                href={`/ops/recruitment/${candidate.openRoleId}`}
                className="font-medium text-indigo hover:text-indigo-light"
              >
                {candidate.openRole.title}
              </Link>{" "}
              at {candidate.openRole.clientOrg.name}
            </p>
          </div>
          <CandidateSourceBadge source={candidate.source} />
        </div>
      </div>

      <div className="space-y-6 rounded-card border border-border bg-paper p-6">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate">
          {candidate.email && <span>{candidate.email}</span>}
          {candidate.phone && <span>{candidate.phone}</span>}
        </div>

        <form action={updateStageWithIds} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div>
            <label className={labelClass} htmlFor="stage">Stage</label>
            <select id="stage" name="stage" defaultValue={candidate.stage} className={inputClass}>
              {CANDIDATE_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{CANDIDATE_STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Update stage</button>
        </form>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          {candidate.yearsExperience && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Experience</p>
              <p className="mt-0.5 text-sm text-ink">{candidate.yearsExperience}</p>
            </div>
          )}
          {candidate.location && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Location</p>
              <p className="mt-0.5 text-sm text-ink">{candidate.location}</p>
            </div>
          )}
          {candidate.expectedPay && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Expected pay</p>
              <p className="mt-0.5 text-sm text-ink">{candidate.expectedPay}</p>
            </div>
          )}
          {cvUrl && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">CV / resume</p>
              <a
                href={cvUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block text-sm font-medium text-indigo hover:text-indigo-light"
              >
                View
              </a>
            </div>
          )}
          {candidate.followedSocials.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Says they follow</p>
              <p className="mt-0.5 text-sm text-ink">{candidate.followedSocials.join(", ")}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Applied</p>
            <p className="mt-0.5 text-sm text-ink">{formatDateShort(candidate.createdAt)}</p>
          </div>
        </div>

        {hasMoreDetails && (
          <div className="space-y-5 border-t border-border pt-4">
            {candidate.howHeard && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                  How they heard about it
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{candidate.howHeard}</p>
              </div>
            )}
            {candidate.answers.map((a) => (
              <div key={a.id}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                  {a.roleQuestion.label}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{a.value}</p>
              </div>
            ))}
            {candidate.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Notes</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{candidate.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <ConfirmSubmitButton
            action={deleteWithIds}
            confirmMessage={`Delete ${candidate.name}? This can't be undone.`}
            className="text-sm font-medium text-slate-light hover:text-orange"
          >
            Delete candidate
          </ConfirmSubmitButton>
        </div>
      </div>
    </div>
  );
}
