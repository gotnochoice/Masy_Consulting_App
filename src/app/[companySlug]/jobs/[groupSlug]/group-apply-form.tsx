"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { RoleQuestion, QuestionSection, GeneralQuestion, OpenRole } from "@/generated/prisma/client";
import { SocialLinks, SocialLinksList, SOCIAL_PLATFORMS } from "@/components/social-links";
import { MAX_RESUME_FILE_BYTES, MAX_RESUME_FILE_LABEL } from "@/lib/resume";
import type { GroupApplyState } from "./actions";

const inputClass =
  "w-full rounded-btn border border-border bg-paper px-3.5 py-2.5 text-sm text-ink transition-shadow focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo-tint";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";
const buttonClass =
  "rounded-btn bg-indigo px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-light disabled:cursor-not-allowed disabled:opacity-50";
const MIN_FOLLOWED_SOCIALS = 2;

type RoleWithQuestions = OpenRole & { questions: RoleQuestion[]; questionSections: QuestionSection[] };

function QuestionField({ id, label, type, options, required, name }: {
  id: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  name: string;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
        {!required && <span className="text-slate-light"> (optional)</span>}
      </label>
      {type === "LONG_TEXT" ? (
        <textarea id={id} name={name} required={required} rows={3} className={inputClass} />
      ) : type === "MULTIPLE_CHOICE" ? (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-3 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:hover]:border-indigo/40"
            >
              <input type="radio" name={name} value={opt} required={required} className="h-4 w-4 shrink-0 accent-indigo" />
              {opt}
            </label>
          ))}
        </div>
      ) : type === "CHECKBOXES" ? (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-3 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:hover]:border-indigo/40"
            >
              <input type="checkbox" name={name} value={opt} className="h-4 w-4 shrink-0 rounded accent-indigo" />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <input id={id} name={name} type={type === "LINK" ? "url" : "text"} required={required} className={inputClass} />
      )}
    </div>
  );
}

export function GroupApplyForm({
  action,
  companyName,
  generalQuestions,
  roles,
}: {
  action: (prevState: GroupApplyState, formData: FormData) => Promise<GroupApplyState>;
  companyName: string;
  generalQuestions: GeneralQuestion[];
  roles: RoleWithQuestions[];
}) {
  const [state, formAction, isPending] = useActionState<GroupApplyState, FormData>(action, {});
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles.length === 1 ? roles[0].id : null);
  const [checkedSocials, setCheckedSocials] = useState<string[]>([]);
  const [followError, setFollowError] = useState<string | null>(null);
  const [resumeFileError, setResumeFileError] = useState<string | null>(null);

  function toggleSocial(name: string) {
    setFollowError(null);
    setCheckedSocials((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (checkedSocials.length < MIN_FOLLOWED_SOCIALS) {
      e.preventDefault();
      setFollowError(`Please select at least ${MIN_FOLLOWED_SOCIALS} platforms you follow us on.`);
    }
  }

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

  if (state.success) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-tint">
          <CheckCircle2 className="h-8 w-8 text-indigo" strokeWidth={2} />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-ink">Application received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate">
          {state.name ? `Thanks, ${state.name}. ` : ""}
          Your application for <span className="font-medium text-ink">{state.roleTitle}</span> at{" "}
          <span className="font-medium text-ink">{companyName}</span> has been recorded.
        </p>
        <div className="mx-auto mt-8 max-w-sm border-t border-border pt-6">
          <p className="text-sm text-slate">Follow us for new roles as they open.</p>
          <SocialLinks className="mt-3 justify-center" />
        </div>
      </div>
    );
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      <div className="hidden" aria-hidden="true">
        <input id="hp_gate" name="hp_gate" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="roleId" value={selectedRoleId ?? ""} />

      <div>
        <label className={labelClass} htmlFor="roleId-picker">Which role are you applying for?</label>
        <div className="space-y-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-start gap-3 rounded-btn border border-border px-3.5 py-3 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint has-[:hover]:border-indigo/40"
            >
              <input
                type="radio"
                name="roleIdPicker"
                value={role.id}
                checked={selectedRoleId === role.id}
                onChange={() => setSelectedRoleId(role.id)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-indigo"
              />
              <span>
                <span className="block font-medium">{role.title}</span>
                {role.location && <span className="block text-xs text-slate-light">📍 {role.location}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>

      {selectedRole && (
        <>
          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <label className={labelClass} htmlFor="name">Full name</label>
              <input id="name" name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">Phone</label>
              <input id="phone" name="phone" required className={inputClass} />
            </div>
            {selectedRole.askApplicantLocation && (
              <div>
                <label className={labelClass} htmlFor="location">Where are you located?</label>
                <input id="location" name="location" required placeholder="e.g. Lekki, Lagos" className={inputClass} />
              </div>
            )}
            {selectedRole.askYearsExperience && (
              <div>
                <label className={labelClass} htmlFor="yearsExperience">Years of experience in this kind of role</label>
                <input id="yearsExperience" name="yearsExperience" required placeholder="e.g. 3 years" className={inputClass} />
              </div>
            )}
            {selectedRole.askExpectedPay && (
              <div>
                <label className={labelClass} htmlFor="expectedPay">Expected pay (₦, monthly)</label>
                <input id="expectedPay" name="expectedPay" required placeholder="e.g. ₦250,000" className={inputClass} />
              </div>
            )}
            {selectedRole.askHowHeard && (
              <div>
                <label className={labelClass} htmlFor="howHeard">How did you hear about this role?</label>
                <select id="howHeard" name="howHeard" required defaultValue="" className={inputClass}>
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
            {selectedRole.askResumeLink && (
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
            )}
          </div>

          {generalQuestions.length > 0 && (
            <div className="space-y-5 border-t border-border pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">A few more questions</p>
              {generalQuestions.map((q) => (
                <QuestionField
                  key={q.id}
                  id={`general-${q.id}`}
                  name={`general_${q.id}`}
                  label={q.label}
                  type={q.type}
                  options={q.options}
                  required={q.required}
                />
              ))}
            </div>
          )}

          {selectedRole.questions.length > 0 && (
            <div className="space-y-5 border-t border-border pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">
                Questions for {selectedRole.title}
              </p>
              {selectedRole.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  id={`answer-${q.id}`}
                  name={`answer_${q.id}`}
                  label={q.label}
                  type={q.type}
                  options={q.options}
                  required={q.required}
                />
              ))}
            </div>
          )}

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <p className="text-sm font-medium text-ink">Follow us</p>
              <p className="mt-1 text-xs text-slate-light">Stay updated on new roles as they open.</p>
              <SocialLinksList className="mt-3" />
            </div>
            <div>
              <p className="text-sm text-ink">Tick at least {MIN_FOLLOWED_SOCIALS} platforms you actually follow us on below.</p>
              <p className="mt-1 text-xs text-slate-light">We check, so please only select platforms you genuinely follow.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {SOCIAL_PLATFORMS.map((s) => (
                  <label
                    key={s.name}
                    className="flex cursor-pointer items-center gap-2 rounded-btn border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-indigo has-[:checked]:bg-indigo-tint"
                  >
                    <input
                      type="checkbox"
                      name="followedSocials"
                      value={s.name}
                      checked={checkedSocials.includes(s.name)}
                      onChange={() => toggleSocial(s.name)}
                      className="h-4 w-4 shrink-0 rounded accent-indigo"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
              {followError && <p className="mt-2 text-xs text-orange">{followError}</p>}
            </div>
            <p className="text-xs text-slate-light">
              By submitting this application, you agree that your information will be used only to evaluate you for
              this role and shared with {companyName}. We won&apos;t use it for anything else.
            </p>
          </div>
        </>
      )}

      {state.error && (
        <p className="rounded-btn border border-orange/30 bg-orange/5 px-3.5 py-2.5 text-sm text-orange">{state.error}</p>
      )}

      <button type="submit" disabled={isPending || !selectedRole} className={`${buttonClass} w-full`}>
        {isPending ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
}
