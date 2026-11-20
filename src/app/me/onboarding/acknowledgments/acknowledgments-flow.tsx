"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/lib/form-styles";
import { KEY_TERM_ITEMS, nextOnboardingStepPath } from "@/lib/onboarding";
import {
  acknowledgeDocument,
  saveKeyTerms,
  submitQuizAttempt,
  completeAcknowledgmentsWithoutQuiz,
  type SaveKeyTermsState,
  type QuizAttemptState,
} from "./actions";

type DocKey = "EMPLOYMENT_AGREEMENT" | "HANDBOOK" | "PRIVACY_NOTICE";
type Section = DocKey | "KEY_TERMS" | "QUIZ" | "DONE";

type DocInfo = { title: string; text: string; version: string; done: boolean };
type QuizQuestion = { id: string; question: string; choices: string[] };

const DOC_ORDER: DocKey[] = ["EMPLOYMENT_AGREEMENT", "HANDBOOK", "PRIVACY_NOTICE"];
const STEP_LABELS: Record<Section, string> = {
  EMPLOYMENT_AGREEMENT: "Agreement",
  HANDBOOK: "Handbook",
  PRIVACY_NOTICE: "Privacy notice",
  KEY_TERMS: "Key terms",
  QUIZ: "Quiz",
  DONE: "Done",
};

function DocumentPanel({ docKey, info, onDone }: { docKey: DocKey; info: DocInfo; onDone: () => void }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [isAcking, setIsAcking] = useState(false);
  const startedAt = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    startedAt.current = Date.now();
    // Short content that doesn't overflow the viewport never fires a scroll event, so the
    // button would stay disabled forever -- treat "nothing to scroll" as already at the end.
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 1) setScrolledToEnd(true);
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) setScrolledToEnd(true);
  }

  async function handleAcknowledge() {
    setIsAcking(true);
    const timeSpentSeconds = Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000);
    await acknowledgeDocument(docKey, info.version, timeSpentSeconds);
    onDone();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{info.title}</h2>
        <span className="text-xs text-slate-light">v{info.version}</span>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto rounded-btn border border-border bg-paper-2 p-4 text-sm leading-relaxed text-slate whitespace-pre-wrap"
      >
        {info.text}
      </div>
      {!scrolledToEnd && <p className="text-xs text-slate-light">Scroll to the end to continue.</p>}
      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={!scrolledToEnd || isAcking}
        className={`${buttonClass} disabled:opacity-50`}
      >
        {isAcking ? "Saving…" : "I've read this -- continue"}
      </button>
    </div>
  );
}

function KeyTermsPanel({
  shiftLabel,
  shiftDescription,
  onDone,
}: {
  shiftLabel: string | null;
  shiftDescription: string | null;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<SaveKeyTermsState, FormData>(
    async (prev, formData) => {
      const result = await saveKeyTerms(prev, formData);
      if (!result) onDone();
      return result;
    },
    undefined,
  );
  // Controlled, not uncontrolled: React resets uncontrolled form fields when a form action
  // completes, even on a validation error, which otherwise wipes every checked box here (there
  // are a dozen) on a failed retry.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setChecked((prev) => ({ ...prev, [key]: e.target.checked }));

  return (
    <form
      // See DocumentPanel/guarantors-form.tsx: avoids the native form.reset() React runs after
      // any <form action={fn}> submission settles, which would otherwise wipe every checkbox
      // here (there are a dozen) on a failed retry.
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-ink">Acknowledgment of key terms</h2>
      <p className="text-sm text-slate">Confirm you understood each of the following, as described in the agreement.</p>
      <div className="space-y-2">
        {KEY_TERM_ITEMS.map((item) => (
          <label key={item.key} className="flex items-start gap-2 rounded-btn border border-border px-3 py-2 text-sm text-slate">
            <input type="checkbox" name={item.key} checked={checked[item.key] ?? false} onChange={toggle(item.key)} required className="mt-0.5" />
            {item.label}
          </label>
        ))}
        <label className="flex items-start gap-2 rounded-btn border border-border px-3 py-2 text-sm text-slate">
          <input
            type="checkbox"
            name="shift_confirmation"
            checked={checked.shift_confirmation ?? false}
            onChange={toggle("shift_confirmation")}
            required
            className="mt-0.5"
          />
          I understand my assigned shift
          {shiftLabel ? `: ${shiftLabel}${shiftDescription ? ` -- ${shiftDescription}` : ""}` : " as described in the agreement"}.
        </label>
      </div>
      {state?.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

function QuizPanel({ questions, onPassed }: { questions: QuizQuestion[]; onPassed: () => void }) {
  const [state, formAction, isPending] = useActionState<QuizAttemptState, FormData>(
    async (prev, formData) => {
      const result = await submitQuizAttempt(prev, formData);
      if (result && "passed" in result && result.passed) onPassed();
      return result;
    },
    undefined,
  );

  const wrongIds = state && "wrongQuestionIds" in state ? new Set(state.wrongQuestionIds) : new Set<string>();
  // Controlled, not uncontrolled: React resets uncontrolled form fields when a form action
  // completes, even on a validation error -- which would otherwise clear every answer on a
  // wrong-answer retry, including questions the employee already got right.
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        formAction(new FormData(e.currentTarget));
      }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-ink">Quick comprehension check</h2>
        <p className="text-sm text-slate">All questions must be answered correctly. You can retry as many times as you need.</p>
      </div>
      {state && "error" in state && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}
      {questions.map((q, i) => (
        <div key={q.id} className={`space-y-2 rounded-btn border p-4 ${wrongIds.has(q.id) ? "border-orange/40 bg-orange/5" : "border-border"}`}>
          <p className="text-sm font-medium text-ink">{i + 1}. {q.question}</p>
          {q.choices.map((choice, idx) => (
            <label key={idx} className="flex items-center gap-2 text-sm text-slate">
              <input
                type="radio"
                name={`q_${q.id}`}
                value={idx}
                checked={answers[q.id] === String(idx)}
                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: String(idx) }))}
                required
              />
              {choice}
            </label>
          ))}
          {wrongIds.has(q.id) && state && "explanations" in state && (
            <p className="text-xs text-orange">Not quite -- {state.explanations[q.id]}</p>
          )}
        </div>
      ))}
      <button type="submit" disabled={isPending} className={`${buttonClass} disabled:opacity-50`}>
        {isPending ? "Checking…" : "Submit answers"}
      </button>
    </form>
  );
}

export function AcknowledgmentsFlow({
  initialDone,
  documents,
  shiftLabel,
  shiftDescription,
  questions,
}: {
  initialDone: { agreement: boolean; handbook: boolean; privacy: boolean; keyTerms: boolean };
  documents: Record<DocKey, DocInfo>;
  shiftLabel: string | null;
  shiftDescription: string | null;
  questions: QuizQuestion[];
}) {
  // A client may not have set up every document, or any quiz -- skip whatever's missing
  // entirely rather than showing an empty box or a dead-end "no quiz set up" error.
  const availableDocs = DOC_ORDER.filter((key) => documents[key].text.trim().length > 0);
  const hasQuiz = questions.length > 0;
  const flow: Section[] = [...availableDocs, "KEY_TERMS", ...(hasQuiz ? (["QUIZ"] as const) : [])];
  const doneMap: Partial<Record<Section, boolean>> = {
    EMPLOYMENT_AGREEMENT: initialDone.agreement,
    HANDBOOK: initialDone.handbook,
    PRIVACY_NOTICE: initialDone.privacy,
    KEY_TERMS: initialDone.keyTerms,
  };
  const firstIncomplete: Section = flow.find((s) => !doneMap[s]) ?? "DONE";
  const [section, setSection] = useState<Section>(firstIncomplete);
  const router = useRouter();
  useEffect(() => {
    if (section === "DONE") router.push(nextOnboardingStepPath("ACKNOWLEDGMENTS"));
  }, [section, router]);

  const currentStepIndex = section === "DONE" ? flow.length : flow.indexOf(section);

  async function advance(current: Section) {
    const idx = flow.indexOf(current);
    const next = flow[idx + 1];
    if (!next && current !== "QUIZ") {
      // Reached the end without a quiz (which marks the step SUBMITTED itself) -- this is
      // what finalizes it instead. The server re-checks everything, so a failure here just
      // leaves the step un-submitted rather than silently completing; logged for visibility.
      const result = await completeAcknowledgmentsWithoutQuiz();
      if (result?.error) console.error("[acknowledgments] failed to finalize without a quiz:", result.error);
    }
    setSection(next ?? "DONE");
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 text-xs text-slate-light">
        {flow.map((s, i) => (
          <span key={s} className={i <= currentStepIndex ? "font-medium text-indigo" : ""}>
            {STEP_LABELS[s]}{i < flow.length - 1 ? " ·" : ""}
          </span>
        ))}
      </div>

      {section === "EMPLOYMENT_AGREEMENT" && (
        <DocumentPanel docKey="EMPLOYMENT_AGREEMENT" info={documents.EMPLOYMENT_AGREEMENT} onDone={() => advance("EMPLOYMENT_AGREEMENT")} />
      )}
      {section === "HANDBOOK" && (
        <DocumentPanel docKey="HANDBOOK" info={documents.HANDBOOK} onDone={() => advance("HANDBOOK")} />
      )}
      {section === "PRIVACY_NOTICE" && (
        <DocumentPanel docKey="PRIVACY_NOTICE" info={documents.PRIVACY_NOTICE} onDone={() => advance("PRIVACY_NOTICE")} />
      )}
      {section === "KEY_TERMS" && (
        <KeyTermsPanel shiftLabel={shiftLabel} shiftDescription={shiftDescription} onDone={() => advance("KEY_TERMS")} />
      )}
      {section === "QUIZ" && <QuizPanel questions={questions} onPassed={() => setSection("DONE")} />}
      {section === "DONE" && (
        <div className="rounded-card border border-indigo/30 bg-indigo-tint px-5 py-4 text-sm text-indigo">
          <p className="font-medium">All done -- submitted for our team to verify.</p>
        </div>
      )}
    </div>
  );
}
