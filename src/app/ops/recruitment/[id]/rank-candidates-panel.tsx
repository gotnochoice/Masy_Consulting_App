"use client";

import { useActionState } from "react";
import { rankUnscoredCandidates, type RankCandidatesState } from "../actions";

export function RankCandidatesPanel({ roleId, unscoredCount }: { roleId: string; unscoredCount: number }) {
  const action = rankUnscoredCandidates.bind(null, roleId);
  const [state, formAction, isPending] = useActionState<RankCandidatesState, FormData>(action, undefined);

  if (unscoredCount === 0 && !(state && "ranked" in state)) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {unscoredCount > 0 && (
        <form action={formAction}>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-btn border border-indigo/30 bg-indigo-tint px-3 py-1.5 text-xs font-medium text-indigo hover:bg-indigo-tint/70 disabled:opacity-50"
          >
            {isPending ? "Ranking…" : `Rank ${unscoredCount} unscored applicant${unscoredCount === 1 ? "" : "s"} with AI`}
          </button>
        </form>
      )}
      {state && "error" in state && <p className="text-xs text-orange">{state.error}</p>}
      {state && "ranked" in state && state.ranked > 0 && (
        <p className="text-xs text-slate-light">
          Ranked {state.ranked}{state.remaining > 0 ? ` — ${state.remaining} more left, click again` : ""}.
        </p>
      )}
    </div>
  );
}
