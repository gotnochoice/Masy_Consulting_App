"use client";

import { useActionState } from "react";
import type { MarkReviewedState } from "./actions";

export function ReviewGate({
  isReviewed,
  reviewedAt,
  hasAgreement,
  hasHandbook,
  hasQuiz,
  onMarkReviewed,
}: {
  isReviewed: boolean;
  reviewedAt: Date | null;
  hasAgreement: boolean;
  hasHandbook: boolean;
  hasQuiz: boolean;
  onMarkReviewed: (state: MarkReviewedState, formData: FormData) => Promise<MarkReviewedState>;
}) {
  const [state, formAction, isPending] = useActionState<MarkReviewedState, FormData>(onMarkReviewed, undefined);

  if (isReviewed) {
    return (
      <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4">
        <p className="text-sm font-medium text-indigo">
          Content reviewed {reviewedAt?.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}.
          New hires can be onboarded.
        </p>
        <p className="mt-1 text-xs text-indigo/80">
          Editing the agreement, handbook, or quiz below will clear this and require re-confirming.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-orange/30 bg-orange/5 px-5 py-4">
      <div>
        <p className="text-sm font-medium text-orange">Not reviewed yet -- new hires can&rsquo;t start onboarding.</p>
        <p className="mt-1 text-xs text-orange/80">
          Any AI-drafted or uploaded content below is a starting point, not a finished legal document. Have it
          checked (by you, or ideally a professional) before confirming it&rsquo;s ready for real employees.
        </p>
      </div>
      <ul className="space-y-1 text-xs text-slate">
        <li>{hasAgreement ? "✓" : "○"} Employment agreement saved</li>
        <li>{hasHandbook ? "✓" : "○"} Handbook saved</li>
        <li>{hasQuiz ? "✓" : "○"} Comprehension quiz generated</li>
      </ul>
      <form
        action={formAction}
        onSubmit={(e) => {
          if (
            !confirm(
              "Confirm you (or a professional) have reviewed the agreement, handbook, and quiz below, and they're ready for real employees to sign?",
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button type="submit" disabled={isPending} className="rounded-btn bg-indigo px-4 py-2 text-sm font-medium text-white hover:bg-indigo-light disabled:opacity-50">
          {isPending ? "Checking…" : "I’ve reviewed this, mark it ready"}
        </button>
        {state?.error && (
          <p className="mt-2 rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
        )}
      </form>
    </div>
  );
}
