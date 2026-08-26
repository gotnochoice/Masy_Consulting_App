"use client";

import { useRef } from "react";
import { CandidateSourceBadge, CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import type { CandidateStage } from "@/generated/prisma/client";
import { inputClass } from "@/lib/form-styles";
import { linkify } from "@/lib/linkify";

type CandidateWithAnswers = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  yearsExperience: string | null;
  location: string | null;
  cvUrl: string | null;
  workSampleUrl: string | null;
  expectedPay: string | null;
  howHeard: string | null;
  followedSocials: string[];
  source: "WEBSITE" | "MASY_SOURCED" | "GOOGLE_FORM";
  stage: CandidateStage;
  answers: { id: string; value: string; roleQuestion: { label: string } }[];
};

export function ClientCandidateCard({
  candidate,
  updateStage,
}: {
  candidate: CandidateWithAnswers;
  updateStage: (formData: FormData) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasDetails = candidate.answers.length > 0 || !!candidate.howHeard;

  return (
    <div className="rounded-card border border-border bg-paper p-4">
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
      {candidate.location && <p className="text-xs text-slate">📍 {candidate.location}</p>}
      {candidate.expectedPay && <p className="text-xs text-slate">Expects {candidate.expectedPay}</p>}
      {candidate.workSampleUrl && (
        <a href={candidate.workSampleUrl} target="_blank" rel="noreferrer" className="mt-2 block">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Blob URL thumbnail, not worth next/image config */}
          <img
            src={candidate.workSampleUrl}
            alt={`${candidate.name}'s work sample`}
            className="h-28 w-full rounded-btn border border-border object-cover"
          />
        </a>
      )}
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
            {candidate.workSampleUrl && (
              <div className="col-span-2 sm:col-span-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-light">Work sample</p>
                <a href={candidate.workSampleUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Blob URL, not worth next/image config */}
                  <img
                    src={candidate.workSampleUrl}
                    alt={`${candidate.name}'s work sample`}
                    className="max-h-72 rounded-card border border-border object-contain"
                  />
                </a>
              </div>
            )}
            {candidate.followedSocials.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">Says they follow</p>
                <p className="mt-0.5 text-sm text-ink">{candidate.followedSocials.join(", ")}</p>
              </div>
            )}
          </div>

          {(candidate.howHeard || candidate.answers.length > 0) && (
            <div className="mt-6 space-y-5 border-t border-border pt-6">
              {candidate.howHeard && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                    How they heard about it
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                    {linkify(candidate.howHeard)}
                  </p>
                </div>
              )}
              {candidate.answers.map((a) => (
                <div key={a.id}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                    {a.roleQuestion.label}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{linkify(a.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
