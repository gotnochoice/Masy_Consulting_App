import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { CandidateCard } from "./candidate-card";
import { CopyLinkButton } from "./copy-link-button";
import { SuggestQuestionsPanel } from "./suggest-questions-panel";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  updateRoleStage,
  addCandidate,
  updateCandidateStage,
  toggleAcceptingApplications,
  updateRoleDescription,
  updateRoleDefaultFields,
  addQuestion,
  updateQuestion,
  moveQuestion,
  deleteQuestion,
  deleteCandidate,
  clearAllCandidates,
} from "../actions";

const ROLE_STAGE_OPTIONS = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "INTERVIEWING", label: "Interviewing" },
  { value: "OFFER", label: "Offer" },
  { value: "FILLED", label: "Filled" },
];

const QUESTION_TYPE_OPTIONS = [
  { value: "SHORT_TEXT", label: "Short answer" },
  { value: "LONG_TEXT", label: "Long answer" },
  { value: "LINK", label: "Link (portfolio, etc.)" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
];

const DEFAULT_FIELD_OPTIONS = [
  { name: "askYearsExperience", label: "Years of experience" },
  { name: "askExpectedPay", label: "Expected pay range" },
  { name: "askHowHeard", label: "How they heard about the role" },
  { name: "askResumeLink", label: "Link to CV / resume" },
] as const;

export default async function RolePipelinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const role = await db.openRole.findUnique({
    where: { id },
    include: {
      clientOrg: true,
      questions: { orderBy: { order: "asc" } },
      candidates: { orderBy: { createdAt: "desc" }, include: { answers: { include: { roleQuestion: true } } } },
    },
  });
  if (!role) notFound();

  const origin = await getOrigin();
  const applyLink = `${origin}/${role.clientOrg.slug}/apply/${role.slug}`;

  const updateRoleStageWithId = updateRoleStage.bind(null, role.id);
  const addCandidateWithId = addCandidate.bind(null, role.id);
  const toggleAcceptingWithId = toggleAcceptingApplications.bind(null, role.id);
  const updateDescriptionWithId = updateRoleDescription.bind(null, role.id);
  const updateDefaultFieldsWithId = updateRoleDefaultFields.bind(null, role.id);
  const addQuestionWithId = addQuestion.bind(null, role.id);
  const clearAllWithId = clearAllCandidates.bind(null, role.id);

  const columns = CANDIDATE_STAGE_ORDER.map((stage) => ({
    stage,
    candidates: role.candidates.filter((c) => c.stage === stage),
  }));

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">{role.title}</h1>
        <p className="text-sm text-slate">{role.clientOrg.name}</p>
      </div>

      <div className="rounded-card border border-border bg-paper p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Public application link</p>
            <p className="text-xs text-slate">{applyLink}</p>
          </div>
          <div className="flex items-center gap-2">
            <CopyLinkButton link={applyLink} />
            <a
              href={`/ops/recruitment/${role.id}/export`}
              className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
            >
              Export CSV
            </a>
            <form action={toggleAcceptingWithId}>
              <input type="hidden" name="acceptingApplications" value={role.acceptingApplications ? "false" : "true"} />
              <button
                type="submit"
                className={`rounded-btn border px-3 py-2 text-xs font-medium ${
                  role.acceptingApplications
                    ? "border-border text-slate hover:text-ink"
                    : "border-orange text-orange"
                }`}
              >
                {role.acceptingApplications ? "Accepting applications" : "Applications closed, reopen"}
              </button>
            </form>
          </div>
        </div>

        <form action={updateDescriptionWithId} className="space-y-1">
          <label className={labelClass} htmlFor="description">What candidates see on the application page</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={role.description ?? ""}
            placeholder="A short description of the role, responsibilities, and what makes this a good fit."
            className={inputClass}
          />
          <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
            Save description
          </button>
        </form>

        <form action={updateDefaultFieldsWithId} className="space-y-2 border-t border-border pt-4">
          <p className={labelClass}>Default fields shown to every applicant</p>
          <p className="text-xs text-slate-light">
            Turn off any of these if a custom question below already covers it for this role.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            {DEFAULT_FIELD_OPTIONS.map((field) => (
              <label key={field.name} className="flex items-center gap-2 text-sm text-slate">
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={role[field.name]}
                  className="rounded border-border"
                />
                {field.label}
              </label>
            ))}
          </div>
          <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
            Save default fields
          </button>
        </form>
      </div>

      <div className="rounded-card border border-border bg-paper p-5">
        <form action={updateRoleStageWithId} className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelClass} htmlFor="stage">Role stage</label>
            <select id="stage" name="stage" defaultValue={role.stage} className={inputClass}>
              {ROLE_STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Update</button>
        </form>
      </div>

      <div className="rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Application questions</h2>
        <p className="mb-4 text-sm text-slate">
          Shown to every applicant on the public form, in this order. Use these for anything specific to this role or
          client, a portfolio link, availability, relevant experience.
        </p>
        <SuggestQuestionsPanel roleId={role.id} />
        <div className="mb-4 space-y-2">
          {role.questions.map((q, i) => {
            const deleteQuestionWithIds = deleteQuestion.bind(null, q.id, role.id);
            const updateQuestionWithIds = updateQuestion.bind(null, q.id, role.id);
            const moveQuestionWithIds = moveQuestion.bind(null, q.id, role.id);
            return (
              <details key={q.id} className="rounded-btn border border-border px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <div>
                    <p className="text-sm text-ink">{q.label}</p>
                    <p className="text-xs text-slate-light">
                      {QUESTION_TYPE_OPTIONS.find((o) => o.value === q.type)?.label} · {q.required ? "required" : "optional"}
                      {q.type === "MULTIPLE_CHOICE" && q.options.length > 0 && ` · ${q.options.join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <form action={moveQuestionWithIds}>
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label="Move question up"
                        className="text-xs font-medium text-slate hover:text-ink disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveQuestionWithIds}>
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === role.questions.length - 1}
                        aria-label="Move question down"
                        className="text-xs font-medium text-slate hover:text-ink disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <span className="text-xs font-medium text-indigo">Edit</span>
                    <form action={deleteQuestionWithIds}>
                      <button type="submit" className="text-xs font-medium text-slate hover:text-orange">Remove</button>
                    </form>
                  </div>
                </summary>

                <form action={updateQuestionWithIds} className="mt-3 space-y-3 border-t border-border pt-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className={labelClass} htmlFor={`label-${q.id}`}>Question</label>
                      <input id={`label-${q.id}`} name="label" required defaultValue={q.label} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`type-${q.id}`}>Answer type</label>
                      <select id={`type-${q.id}`} name="type" defaultValue={q.type} className={inputClass}>
                        {QUESTION_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 pb-2 text-sm text-slate">
                      <input type="checkbox" name="required" defaultChecked={q.required} className="rounded border-border" />
                      Required
                    </label>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor={`options-${q.id}`}>
                      Choices (for multiple choice only, one per line)
                    </label>
                    <textarea
                      id={`options-${q.id}`}
                      name="options"
                      rows={3}
                      defaultValue={q.options.join("\n")}
                      placeholder={"Option A\nOption B\nOption C"}
                      className={inputClass}
                    />
                  </div>
                  <button type="submit" className={buttonClass}>Save changes</button>
                </form>
              </details>
            );
          })}
          {role.questions.length === 0 && (
            <p className="text-sm text-slate-light">No custom questions yet. Applicants will just submit name, email, and a CV link.</p>
          )}
        </div>
        <form action={addQuestionWithId} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className={labelClass} htmlFor="label">Question</label>
              <input id="label" name="label" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="type">Answer type</label>
              <select id="type" name="type" defaultValue="SHORT_TEXT" className={inputClass}>
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate">
              <input type="checkbox" name="required" defaultChecked className="rounded border-border" />
              Required
            </label>
          </div>
          <div>
            <label className={labelClass} htmlFor="options">
              Choices (for multiple choice only, one per line)
            </label>
            <textarea id="options" name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Add question</button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Pipeline</h2>
          {role.candidates.length > 0 && (
            <ConfirmSubmitButton
              action={clearAllWithId}
              confirmMessage={`Delete all ${role.candidates.length} candidate(s) for this role? This can't be undone, so export a CSV first if you want to keep a record.`}
              className="text-xs font-medium text-slate hover:text-orange"
            >
              Clear all candidates
            </ConfirmSubmitButton>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {columns.map(({ stage, candidates }) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-light">
                  {CANDIDATE_STAGE_LABELS[stage]}
                </p>
                <span className="text-xs text-slate-light">{candidates.length}</span>
              </div>
              <div className="space-y-3">
                {candidates.map((candidate) => {
                  const updateStageWithIds = updateCandidateStage.bind(null, candidate.id, role.id);
                  const deleteWithIds = deleteCandidate.bind(null, candidate.id, role.id);
                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      updateStage={updateStageWithIds}
                      deleteCandidate={deleteWithIds}
                    />
                  );
                })}
                {candidates.length === 0 && (
                  <p className="rounded-card border border-dashed border-border px-3 py-4 text-center text-xs text-slate-light">
                    None
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Add a candidate manually</h2>
        <p className="mb-4 text-sm text-slate">For candidates sourced outside the application link, referrals, LinkedIn outreach, and so on.</p>
        <form action={addCandidateWithId} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">Email (optional)</label>
            <input id="email" name="email" type="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="yearsExperience">Years of experience (optional)</label>
            <input id="yearsExperience" name="yearsExperience" placeholder="e.g. 3 years" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" name="notes" rows={2} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Add candidate</button>
        </form>
      </div>
    </div>
  );
}
