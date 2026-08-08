"use client";

import { useRef } from "react";
import { CandidateSourceBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import type { CandidateStage } from "@/generated/prisma/client";
import { inputClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type CandidateWithAnswers = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  yearsExperience: string | null;
  cvUrl: string | null;
  expectedPay: string | null;
  howHeard: string | null;
  notes: string | null;
  source: "WEBSITE" | "MASY_SOURCED";
  stage: CandidateStage;
  answers: { id: string; value: string; roleQuestion: { label: string } }[];
};

export function CandidateCard({
  candidate,
  updateStage,
  deleteCandidate,
}: {
  candidate: CandidateWithAnswers;
  updateStage: (formData: FormData) => Promise<void>;
  deleteCandidate: (formData: FormData) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasDetails = candidate.answers.length > 0 || !!candidate.notes || !!candidate.howHeard;

  return (
    <div id={`candidate-${candidate.id}`} className="rounded-card border border-border bg-paper p-4 scroll-mt-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="text-left text-sm font-medium text-ink hover:text-indigo"
        >
          {candidate.name}
        </button>
        <CandidateSourceBadge source={candidate.source} />
      </div>
      {candidate.email && <p className="truncate text-xs text-slate">{candidate.email}</p>}
      {candidate.phone && <p className="text-xs text-slate">{candidate.phone}</p>}
      {candidate.yearsExperience && <p className="text-xs text-slate">{candidate.yearsExperience} experience</p>}
      {candidate.expectedPay && <p className="text-xs text-slate">Expects {candidate.expectedPay}</p>}
      {candidate.cvUrl && (
        <a
          href={candidate.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-medium text-indigo hover:text-indigo-light"
        >
          View CV / resume
        </a>
      )}

      {hasDetails && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="mt-2 block text-xs font-medium text-indigo hover:text-indigo-light"
        >
          View full application →
        </button>
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

      <ConfirmSubmitButton
        action={deleteCandidate}
        confirmMessage={`Delete ${candidate.name}? This can't be undone.`}
        className="mt-2 text-xs font-medium text-slate-light hover:text-orange"
      >
        Delete
      </ConfirmSubmitButton>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="w-full max-w-2xl rounded-card border border-border bg-paper p-0 backdrop:bg-ink/40 open:flex open:flex-col"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <h2 className="text-lg font-bold text-ink">{candidate.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <CandidateSourceBadge source={candidate.source} />
              {candidate.email && <span className="text-sm text-slate">{candidate.email}</span>}
              {candidate.phone && <span className="text-sm text-slate">{candidate.phone}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-btn border border-border px-3 py-1.5 text-sm font-medium text-slate hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {candidate.yearsExperience && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Experience</p>
                <p className="mt-0.5 text-sm text-ink">{candidate.yearsExperience}</p>
              </div>
            )}
            {candidate.expectedPay && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Expected pay</p>
                <p className="mt-0.5 text-sm text-ink">{candidate.expectedPay}</p>
              </div>
            )}
            {candidate.cvUrl && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">CV / resume</p>
                <a
                  href={candidate.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-sm font-medium text-indigo hover:text-indigo-light"
                >
                  View
                </a>
              </div>
            )}
          </div>

          {(candidate.howHeard || candidate.answers.length > 0 || candidate.notes) && (
            <div className="mt-6 space-y-5 border-t border-border pt-6">
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
        </div>
      </dialog>
    </div>
  );
}
