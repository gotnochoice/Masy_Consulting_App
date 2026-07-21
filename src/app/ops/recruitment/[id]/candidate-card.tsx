"use client";

import { CandidateSourceBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import type { CandidateStage } from "@/generated/prisma/client";
import { inputClass } from "@/lib/form-styles";

type CandidateWithAnswers = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  resumeLink: string | null;
  notes: string | null;
  source: "WEBSITE" | "MASY_SOURCED";
  stage: CandidateStage;
  answers: { id: string; value: string; roleQuestion: { label: string } }[];
};

export function CandidateCard({
  candidate,
  updateStage,
}: {
  candidate: CandidateWithAnswers;
  updateStage: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-card border border-border bg-paper shadow-[0_1px_2px_rgba(26,19,48,0.06),0_2px_10px_-4px_rgba(26,19,48,0.10)] p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{candidate.name}</p>
        <CandidateSourceBadge source={candidate.source} />
      </div>
      {candidate.email && <p className="truncate text-xs text-slate">{candidate.email}</p>}
      {candidate.phone && <p className="text-xs text-slate">{candidate.phone}</p>}
      {candidate.resumeLink && (
        <a
          href={candidate.resumeLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-medium text-indigo hover:text-indigo-light"
        >
          View CV / resume
        </a>
      )}

      {(candidate.answers.length > 0 || candidate.notes) && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-slate hover:text-ink">
            View details
          </summary>
          <div className="mt-2 space-y-2">
            {candidate.answers.map((a) => (
              <div key={a.id}>
                <p className="text-xs font-medium text-slate-light">{a.roleQuestion.label}</p>
                <p className="text-xs text-ink">{a.value}</p>
              </div>
            ))}
            {candidate.notes && (
              <div>
                <p className="text-xs font-medium text-slate-light">Notes</p>
                <p className="text-xs text-ink">{candidate.notes}</p>
              </div>
            )}
          </div>
        </details>
      )}

      <form action={updateStage} className="mt-3">
        <select
          name="stage"
          defaultValue={candidate.stage}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className={`${inputClass} py-1.5 text-xs`}
        >
          {CANDIDATE_STAGE_ORDER.map((stage) => (
            <option key={stage} value={stage}>{CANDIDATE_STAGE_LABELS[stage]}</option>
          ))}
        </select>
      </form>
    </div>
  );
}
