import type { RoleStage, CandidateStage } from "@/generated/prisma/client";

const ROLE_STYLES: Record<RoleStage, string> = {
  SOURCING: "bg-paper-2 text-slate border border-border",
  INTERVIEWING: "bg-orange-light/40 text-orange",
  OFFER: "bg-indigo-tint text-indigo",
  FILLED: "bg-indigo text-white",
};

const CANDIDATE_STYLES: Record<CandidateStage, string> = {
  SOURCING: "bg-paper-2 text-slate border border-border",
  INTERVIEWING: "bg-orange-light/40 text-orange",
  OFFER: "bg-indigo-tint text-indigo",
  FILLED: "bg-indigo text-white",
  REJECTED: "bg-paper-2 text-slate-light border border-border line-through",
};

const LABELS: Record<string, string> = {
  SOURCING: "Sourcing",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  FILLED: "Filled",
  REJECTED: "Rejected",
};

function badgeClass(styles: string) {
  return `inline-flex items-center rounded-btn px-2.5 py-0.5 font-mono text-xs font-medium ${styles}`;
}

export function RoleStageBadge({ stage }: { stage: RoleStage }) {
  return <span className={badgeClass(ROLE_STYLES[stage])}>{LABELS[stage]}</span>;
}

export function CandidateStageBadge({ stage }: { stage: CandidateStage }) {
  return <span className={badgeClass(CANDIDATE_STYLES[stage])}>{LABELS[stage]}</span>;
}
