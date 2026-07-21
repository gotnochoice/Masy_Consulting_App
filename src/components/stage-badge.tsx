import type { RoleStage, CandidateStage, CandidateSource } from "@/generated/prisma/client";

const ROLE_STYLES: Record<RoleStage, string> = {
  SOURCING: "bg-paper-2 text-slate border border-border",
  INTERVIEWING: "bg-orange-light/40 text-orange",
  OFFER: "bg-indigo-tint text-indigo",
  FILLED: "bg-indigo text-white",
};

const CANDIDATE_STYLES: Record<CandidateStage, string> = {
  APPLIED: "bg-paper-2 text-slate border border-border",
  SCREENING: "bg-indigo-tint text-indigo",
  INTERVIEWING: "bg-orange-light/40 text-orange",
  OFFER: "bg-orange text-white",
  HIRED: "bg-indigo text-white",
  REJECTED: "bg-paper-2 text-slate-light border border-border line-through",
};

const ROLE_LABELS: Record<RoleStage, string> = {
  SOURCING: "Sourcing",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  FILLED: "Filled",
};

const CANDIDATE_LABELS: Record<CandidateStage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const SOURCE_STYLES: Record<CandidateSource, string> = {
  WEBSITE: "bg-indigo-tint text-indigo",
  MASY_SOURCED: "bg-paper-2 text-slate border border-border",
};

const SOURCE_LABELS: Record<CandidateSource, string> = {
  WEBSITE: "Applied online",
  MASY_SOURCED: "Added by Masy",
};

function badgeClass(styles: string) {
  return `inline-flex items-center rounded-btn px-2.5 py-0.5 font-mono text-xs font-medium ${styles}`;
}

export function RoleStageBadge({ stage }: { stage: RoleStage }) {
  return <span className={badgeClass(ROLE_STYLES[stage])}>{ROLE_LABELS[stage]}</span>;
}

export function CandidateStageBadge({ stage }: { stage: CandidateStage }) {
  return <span className={badgeClass(CANDIDATE_STYLES[stage])}>{CANDIDATE_LABELS[stage]}</span>;
}

export function CandidateSourceBadge({ source }: { source: CandidateSource }) {
  return <span className={badgeClass(SOURCE_STYLES[source])}>{SOURCE_LABELS[source]}</span>;
}

export const CANDIDATE_STAGE_ORDER: CandidateStage[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEWING",
  "OFFER",
  "HIRED",
  "REJECTED",
];

export { CANDIDATE_LABELS as CANDIDATE_STAGE_LABELS };
