import type { ConcernVisibility } from "@/generated/prisma/client";

const STYLES: Record<ConcernVisibility, string> = {
  RAW: "bg-orange-light/40 text-orange",
  MASY_REVIEWED: "bg-indigo-tint text-indigo",
  CLIENT_VISIBLE: "bg-paper-2 text-slate border border-border",
};

const LABELS: Record<ConcernVisibility, string> = {
  RAW: "Needs review",
  MASY_REVIEWED: "Reviewed",
  CLIENT_VISIBLE: "Released to client",
};

export function ConcernVisibilityBadge({ visibility }: { visibility: ConcernVisibility }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${STYLES[visibility]}`}
    >
      {LABELS[visibility]}
    </span>
  );
}
