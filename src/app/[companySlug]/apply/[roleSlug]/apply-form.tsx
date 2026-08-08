"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RoleQuestion, QuestionSection } from "@/generated/prisma/client";
import { SocialLinks, SocialLinksList } from "@/components/social-links";
import { MAX_RESUME_FILE_BYTES, MAX_RESUME_FILE_LABEL } from "@/lib/resume";
import type { ApplyState } from "./actions";

const inputClass =
  "w-full rounded-btn border border-border bg-paper px-3.5 py-2.5 text-sm text-ink transition-shadow focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo-tint";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";
const buttonClass =
  "rounded-btn bg-indigo px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-light disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-btn border border-border px-4 py-3 text-sm font-semibold text-slate transition-colors hover:border-ink/20 hover:text-ink";

// Fields on steps that aren't currently showing must not carry `required`, or the browser's
// native validation blocks advancing/submitting on fields the applicant can't even see yet.
// Their entered values are preserved regardless (the DOM node stays mounted, just visually hidden).
function QuestionField({ q, active }: { q: RoleQuestion; active: boolean }) {
  const required = active && q.required;
  return (
    <div>
      <label className={labelClass} htmlFor={`answer_${q.id}`}>
        {q.label}
        {!q.required && <span className="text-slate-light"> (optional)</span>}
      </label>
      {q.type === "LONG_TEXT" ? (
        <textarea id={`answer_${q.id}`} name={`answer_${q.id}`} required={required} rows={3} className={inputClass} />
      ) : q.type === "MULTIPLE_CHOICE" ? (
        <div className="space-y-2">
          {q.options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-3 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:hover]:border-indigo/40"
            >
              <input
                type="radio"
                name={`answer_${q.id}`}
                value={opt}
                required={required}
                className="h-4 w-4 shrink-0 accent-indigo"
              />
              {opt}
            </label>
          ))}
        </div>
      ) : q.type === "CHECKBOXES" ? (
        // A checkbox group can't use `required` per-box (that would force every box checked
        // instead of "at least one"), so "at least one selected" is enforced server-side.
        <div className="space-y-2">
          {q.options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-3 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:hover]:border-indigo/40"
            >
              <input
                type="checkbox"
                name={`answer_${q.id}`}
                value={opt}
                className="h-4 w-4 shrink-0 rounded accent-indigo"
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <input
          id={`answer_${q.id}`}
          name={`answer_${q.id}`}
          type={q.type === "LINK" ? "url" : "text"}
          required={required}
          className={inputClass}
        />
      )}
    </div>
  );
}

type Step = { key: string; label: string; content: ReactNode };

export function ApplyForm({
  action,
  questions,
  questionSections,
  roleTitle,
  companyName,
  askYearsExperience,
  askExpectedPay,
  askHowHeard,
  askResumeLink,
}: {
  action: (prevState: ApplyState, formData: FormData) => Promise<ApplyState>;
  questions: RoleQuestion[];
  questionSections: QuestionSection[];
  roleTitle: string;
  companyName: string;
  askYearsExperience: boolean;
  askExpectedPay: boolean;
  askHowHeard: boolean;
  askResumeLink: boolean;
}) {
  const [state, formAction, isPending] = useActionState<ApplyState, FormData>(action, {});
  const [currentStep, setCurrentStep] = useState(0);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);
  const [resumeFileError, setResumeFileError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleResumeFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setResumeFileError(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setResumeFileError("Please upload a PDF file.");
      e.target.value = "";
    } else if (file.size > MAX_RESUME_FILE_BYTES) {
      setResumeFileError(`That file is too large. Please keep it under ${MAX_RESUME_FILE_LABEL}.`);
      e.target.value = "";
    } else {
      setResumeFileError(null);
    }
  }

  const ungroupedQuestions = questions.filter((q) => !q.sectionId);
  const namedSections = questionSections
    .map((section) => ({ section, questions: questions.filter((q) => q.sectionId === section.id) }))
    .filter((s) => s.questions.length > 0);

  const steps: Step[] = [];

  {
    const active = steps.length === currentStep;
    steps.push({
      key: "basics",
      label: "The basics",
      content: (
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="name">Full name</label>
            <input id="name" name="name" required={active} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required={active} className={inputClass} />
            <p className="mt-1 text-xs text-slate-light">We&apos;ll use this to keep you updated on your application.</p>
          </div>
        </div>
      ),
    });
  }

  {
    const active = steps.length === currentStep;
    steps.push({
      key: "personal",
      label: "Personal details",
      content: (
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" required={active} className={inputClass} />
          </div>
          {askYearsExperience && (
            <div>
              <label className={labelClass} htmlFor="yearsExperience">Years of experience in this kind of role</label>
              <input id="yearsExperience" name="yearsExperience" required={active} placeholder="e.g. 3 years" className={inputClass} />
            </div>
          )}
          {askExpectedPay && (
            <div>
              <label className={labelClass} htmlFor="expectedPay">Expected pay range</label>
              <input
                id="expectedPay"
                name="expectedPay"
                required={active}
                className={inputClass}
              />
            </div>
          )}
          {askHowHeard && (
            <div>
              <label className={labelClass} htmlFor="howHeard">How did you hear about this role?</label>
              <select id="howHeard" name="howHeard" required={active} defaultValue="" className={inputClass}>
                <option value="" disabled>Select one</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Instagram / social media">Instagram / social media</option>
                <option value="Job board">Job board</option>
                <option value="Referral from someone">Referral from someone</option>
                <option value="Masy Consulting website">Masy Consulting website</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}
        </div>
      ),
    });
  }

  if (askResumeLink) {
    steps.push({
      key: "materials",
      label: "Application materials",
      content: (
        <div>
          <label className={labelClass} htmlFor="resumeFile">Upload your CV / resume</label>
          <input
            id="resumeFile"
            name="resumeFile"
            type="file"
            accept="application/pdf"
            onChange={handleResumeFileChange}
            className={`${inputClass} file:mr-3 file:rounded-btn file:border-0 file:bg-indigo-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo`}
          />
          <p className="mt-1 text-xs text-slate-light">PDF only, up to {MAX_RESUME_FILE_LABEL}.</p>
          {resumeFileError && <p className="mt-1 text-xs text-orange">{resumeFileError}</p>}
        </div>
      ),
    });
  }

  if (ungroupedQuestions.length > 0) {
    const active = steps.length === currentStep;
    steps.push({
      key: "additional",
      label: "Additional questions",
      content: (
        <div className="space-y-5">
          {ungroupedQuestions.map((q) => (
            <QuestionField key={q.id} q={q} active={active} />
          ))}
        </div>
      ),
    });
  }

  for (const { section, questions: sectionQuestions } of namedSections) {
    const active = steps.length === currentStep;
    steps.push({
      key: section.id,
      label: section.title,
      content: (
        <div className="space-y-5">
          {sectionQuestions.map((q) => (
            <QuestionField key={q.id} q={q} active={active} />
          ))}
        </div>
      ),
    });
  }

  const isLastStep = currentStep === steps.length - 1;

  function goNext() {
    if (formRef.current && !formRef.current.reportValidity()) return;
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (state.success) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-tint">
          <CheckCircle2 className="h-8 w-8 text-indigo" strokeWidth={2} />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Application received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">
          {state.name ? `Thanks, ${state.name}. ` : ""}
          Your application for <span className="font-medium text-ink">{roleTitle}</span> at{" "}
          <span className="font-medium text-ink">{companyName}</span> has been recorded.
        </p>

        <div className="mx-auto mt-8 max-w-sm space-y-4 border-t border-border pt-6 text-left">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-btn bg-indigo-tint text-xs font-bold text-indigo">
              01
            </span>
            <p className="text-sm text-slate">
              Masy Consulting reviews every application on behalf of {companyName}.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-btn bg-indigo-tint text-xs font-bold text-indigo">
              02
            </span>
            <p className="text-sm text-slate">
              If there&apos;s a fit, we&apos;ll reach out to you directly, or you can reach us at hello@masyconsulting.com.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-sm border-t border-border pt-6">
          <p className="text-sm text-slate">
            Follow us for new roles as they open.
          </p>
          <SocialLinks className="mt-3 justify-center" />
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/*
        Honeypot: real applicants never see this field. It's fully display:none (not just
        visually clipped) and its name avoids anything autofill heuristics recognize
        ("website", "url", "company"), because password managers happily fill hidden fields
        that are still technically present in the accessibility tree, which was silently
        marking real applications as spam.
      */}
      <div className="hidden" aria-hidden="true">
        <input id="hp_gate" name="hp_gate" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {steps.map((step, i) => (
            <div key={step.key} className="flex shrink-0 items-center gap-1.5">
              {i > 0 && <span className={`h-px w-4 ${i <= currentStep ? "bg-indigo" : "bg-border"}`} />}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-btn text-xs font-bold ${
                  i === currentStep
                    ? "bg-indigo text-white"
                    : i < currentStep
                      ? "bg-indigo-tint text-indigo"
                      : "border border-border bg-paper text-slate-light"
                }`}
              >
                {i < currentStep ? "✓" : i + 1}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-slate-light">
          Step {currentStep + 1} of {steps.length} &middot; {steps[currentStep].label}
        </p>
      </div>

      {steps.map((step, i) => (
        <div key={step.key} className={i === currentStep ? "" : "hidden"}>
          {step.content}
        </div>
      ))}

      {state.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}

      {isLastStep && (
        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <p className="text-sm font-medium text-ink">Follow us on social media</p>
            <p className="mt-1 text-xs text-slate-light">Stay updated on new roles as they open.</p>
            <SocialLinksList className="mt-3" />
          </div>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint">
              <input
                type="radio"
                name="followsSocial"
                value="yes"
                required
                onChange={() => setShowFollowPrompt(false)}
                className="h-4 w-4 shrink-0 accent-indigo"
              />
              I follow Masy Consulting on social media
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint">
              <input
                type="radio"
                name="followsSocial"
                value="no"
                required
                onChange={() => setShowFollowPrompt(true)}
                className="h-4 w-4 shrink-0 accent-indigo"
              />
              I don&apos;t follow yet
            </label>
          </div>
          <p className="text-xs text-slate-light">
            By submitting this application, you agree that your information will be used only to evaluate you for this
            role and shared with {companyName}. We won&apos;t use it for anything else.
          </p>
        </div>
      )}

      {showFollowPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setShowFollowPrompt(false)}
        >
          <div
            className="w-full max-w-sm rounded-card bg-paper p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-ink">Follow us to continue</p>
            <p className="mt-2 text-sm text-slate">
              Please follow Masy Consulting on social media to stay updated on new roles, then come back and select
              &ldquo;I follow Masy Consulting on social media&rdquo; above to continue.
            </p>
            <SocialLinksList className="mt-4" />
            <button
              type="button"
              onClick={() => setShowFollowPrompt(false)}
              className={`mt-4 w-full ${buttonClass}`}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3 border-t border-border pt-6">
        {currentStep > 0 && (
          <button type="button" onClick={goBack} className={secondaryButtonClass}>
            Back
          </button>
        )}
        {isLastStep ? (
          <button type="submit" disabled={isPending} className={`flex-1 ${buttonClass}`}>
            {isPending ? "Submitting..." : "Submit application"}
          </button>
        ) : (
          <button type="button" onClick={goNext} className={`flex-1 ${buttonClass}`}>
            Next
          </button>
        )}
      </div>
    </form>
  );
}
