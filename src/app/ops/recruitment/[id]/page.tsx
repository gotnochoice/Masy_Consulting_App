import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import type { RoleQuestion } from "@/generated/prisma/client";
import { CANDIDATE_STAGE_ORDER, CANDIDATE_STAGE_LABELS } from "@/components/stage-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { CandidateCard } from "./candidate-card";
import { CopyLinkButton } from "./copy-link-button";
import { SuggestQuestionsPanel } from "./suggest-questions-panel";
import { SectionMoveSelect } from "./section-move-select";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  updateRoleStage,
  addCandidate,
  updateCandidateStage,
  toggleAcceptingApplications,
  updateRoleTitle,
  updateRoleCompany,
  regenerateRoleSlug,
  getShortLink,
  updateRoleLocation,
  updateRoleSchedulingLink,
  updateRoleCustomInterviewMessage,
  updateRoleCustomOfferMessage,
  updateRoleDescription,
  updateRoleDefaultFields,
  updateRoleMode,
  updateRoleWorkSampleLabel,
  enableGoogleFormIntake,
  disableGoogleFormIntake,
  updateRoleGoogleFormPublicUrl,
  addQuestion,
  updateQuestion,
  moveQuestion,
  moveQuestionToSection,
  deleteQuestion,
  createQuestionSection,
  renameQuestionSection,
  deleteQuestionSection,
  moveQuestionSection,
  deleteCandidate,
  clearAllCandidates,
  sendCandidateRejectionEmail,
  sendCandidateInterviewInviteEmail,
  sendCandidateOfferEmail,
  convertCandidateToEmployee,
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
  { value: "MULTIPLE_CHOICE", label: "Multiple choice (pick one)" },
  { value: "CHECKBOXES", label: "Checkboxes (pick multiple)" },
];

const DEFAULT_FIELD_OPTIONS = [
  { name: "askApplicantLocation", label: "Applicant's location" },
  { name: "askYearsExperience", label: "Years of experience" },
  { name: "askExpectedPay", label: "Expected pay (₦, monthly)" },
  { name: "askHowHeard", label: "How they heard about the role" },
  { name: "askResumeLink", label: "Link to CV / resume" },
] as const;

function SectionSelect({
  id,
  sections,
  defaultValue,
}: {
  id: string;
  sections: { id: string; title: string }[];
  defaultValue: string;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>Section</label>
      <select id={id} name="sectionId" defaultValue={defaultValue} className={inputClass}>
        <option value="">No section</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
    </div>
  );
}

function QuestionRow({
  q,
  index,
  siblingCount,
  roleId,
  sections,
}: {
  q: RoleQuestion;
  index: number;
  siblingCount: number;
  roleId: string;
  sections: { id: string; title: string }[];
}) {
  const deleteQuestionWithIds = deleteQuestion.bind(null, q.id, roleId);
  const updateQuestionWithIds = updateQuestion.bind(null, q.id, roleId);
  const moveQuestionWithIds = moveQuestion.bind(null, q.id, roleId);
  const moveToSectionWithIds = moveQuestionToSection.bind(null, q.id, roleId);

  return (
    <details className="rounded-btn border border-border px-3 py-2">
      <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div>
          <p className="text-sm text-ink">{q.label}</p>
          <p className="text-xs text-slate-light">
            {QUESTION_TYPE_OPTIONS.find((o) => o.value === q.type)?.label} · {q.required ? "required" : "optional"}
            {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOXES") && q.options.length > 0 && ` · ${q.options.join(", ")}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {sections.length > 0 && (
            <SectionMoveSelect action={moveToSectionWithIds} sections={sections} defaultValue={q.sectionId ?? ""} />
          )}
          <form action={moveQuestionWithIds}>
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={index === 0}
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
              disabled={index === siblingCount - 1}
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
            Choices (for multiple choice or checkboxes only, one per line)
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
}

type GoogleFormQuestion = {
  label: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "LINK" | "MULTIPLE_CHOICE" | "CHECKBOXES";
  options: string[];
  required: boolean;
  sectionId: string | null;
};

type GoogleFormSection = { id: string; title: string };

function js(value: string) {
  return JSON.stringify(value);
}

function googleFormAddItemCode(q: GoogleFormQuestion): string {
  switch (q.type) {
    case "LONG_TEXT":
      return `form.addParagraphTextItem().setTitle(${js(q.label)}).setRequired(${q.required});`;
    case "LINK":
      return `form.addTextItem().setTitle(${js(q.label)}).setHelpText("Paste a link").setRequired(${q.required});`;
    case "MULTIPLE_CHOICE":
      return `form.addMultipleChoiceItem().setTitle(${js(q.label)}).setChoiceValues([${q.options.map(js).join(", ")}]).setRequired(${q.required});`;
    case "CHECKBOXES":
      return `form.addCheckboxItem().setTitle(${js(q.label)}).setChoiceValues([${q.options.map(js).join(", ")}]).setRequired(${q.required});`;
    case "SHORT_TEXT":
    default:
      return `form.addTextItem().setTitle(${js(q.label)}).setRequired(${q.required});`;
  }
}

function buildGoogleFormCreatorScript({
  roleId,
  mode,
  roleTitle,
  companyName,
  webhookUrl,
  workSampleLabel,
  askApplicantLocation,
  askYearsExperience,
  askExpectedPay,
  askHowHeard,
  askResumeLink,
  ungroupedQuestions,
  sections,
  questionsBySection,
}: {
  roleId: string;
  mode: "FORMAL" | "INFORMAL";
  roleTitle: string;
  companyName: string;
  webhookUrl: string;
  workSampleLabel: string | null;
  askApplicantLocation: boolean;
  askYearsExperience: boolean;
  askExpectedPay: boolean;
  askHowHeard: boolean;
  askResumeLink: boolean;
  ungroupedQuestions: GoogleFormQuestion[];
  sections: GoogleFormSection[];
  questionsBySection: Map<string, GoogleFormQuestion[]>;
}): string {
  // Suffixed with the role id so pasting scripts for multiple roles into the same
  // Apps Script project never collides — two functions can't share a name in one file,
  // and the last one defined would silently win for every form's trigger.
  const fnSuffix = roleId.replace(/[^a-zA-Z0-9]/g, "");
  const createFnName = `createApplicationForm_${fnSuffix}`;
  const submitFnName = `onFormSubmit_${fnSuffix}`;

  const lines: string[] = [];
  let needsManualFileUpload = false;

  if (mode === "INFORMAL") {
    lines.push(`  form.addTextItem().setTitle("Your full name").setRequired(true);`);
    lines.push(`  form.addTextItem().setTitle("Your phone number").setRequired(true);`);
    lines.push(
      `  form.addTextItem().setTitle("Email").setHelpText("Only if you have one").setRequired(false).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());`,
    );
    lines.push(`  form.addTextItem().setTitle("Where are you? (e.g. Maryland, Lagos)").setRequired(false);`);
    needsManualFileUpload = true;
  } else {
    lines.push(`  form.addTextItem().setTitle("Full name").setRequired(true);`);
    lines.push(
      `  form.addTextItem().setTitle("Email").setRequired(true).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());`,
    );
    lines.push(`  form.addTextItem().setTitle("Phone").setRequired(true);`);
    if (askApplicantLocation) lines.push(`  form.addTextItem().setTitle("Where are you located?").setRequired(false);`);
    if (askYearsExperience)
      lines.push(`  form.addTextItem().setTitle("Years of experience in this kind of role").setRequired(false);`);
    if (askExpectedPay) lines.push(`  form.addTextItem().setTitle("Expected pay (₦, monthly)").setRequired(false);`);
    if (askHowHeard) lines.push(`  form.addTextItem().setTitle("How did you hear about this role?").setRequired(false);`);
    if (askResumeLink) needsManualFileUpload = true;

    for (const q of ungroupedQuestions) {
      lines.push(`  ${googleFormAddItemCode(q)}`);
    }
    for (const section of sections) {
      lines.push(`  form.addPageBreakItem().setTitle(${js(section.title)});`);
      for (const q of questionsBySection.get(section.id) ?? []) {
        lines.push(`  ${googleFormAddItemCode(q)}`);
      }
    }
  }

  const fileUploadTitle = mode === "INFORMAL" ? workSampleLabel || "Photo of your work" : "Upload your CV / resume";
  const fileUploadNote = needsManualFileUpload
    ? `"\\n\\nOne manual step: Google won't let scripts create File upload questions, so open the edit link above and add one yourself (+ button -> File upload), titled " + ${js(fileUploadTitle)} + ". Submissions to it will flow into the pipeline automatically once it's there."`
    : `""`;

  return `// This script is scoped to ${js(roleTitle)} — the function names below include this
// role's id so you can safely paste multiple roles' scripts into the same Apps Script
// project without one overwriting another's trigger.
function ${createFnName}() {
  var form = FormApp.create(${js(`${roleTitle} — ${companyName} Application`)});
  form.setConfirmationMessage(${js(`Thanks! Someone from ${companyName} or Masy Consulting will be in touch.`)});

${lines.join("\n")}

  ScriptApp.newTrigger(${js(submitFnName)}).forForm(form).onFormSubmit().create();

  var links = "Edit this form: " + form.getEditUrl() + "\\n\\nShare this link with applicants: " + form.getPublishedUrl() + ${fileUploadNote};
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Your new Google Form is ready", links);
  Logger.log(links);
}

function ${submitFnName}(e) {
  var answers = {};
  e.response.getItemResponses().forEach(function (item) {
    var title = item.getItem().getTitle();
    var value = item.getResponse();

    if (item.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
      var ids = Array.isArray(value) ? value : [value];
      value = ids.map(function (id) {
        var file = DriveApp.getFileById(id);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000";
      });
    }

    answers[title] = value;
  });

  UrlFetchApp.fetch(${js(webhookUrl)}, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ answers: answers }),
  });
}`;
}

export default async function RolePipelinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const [role, orgs] = await Promise.all([
    db.openRole.findUnique({
      where: { id },
      include: {
        clientOrg: true,
        questions: { orderBy: { order: "asc" } },
        questionSections: { orderBy: { order: "asc" } },
        candidates: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            yearsExperience: true,
            location: true,
            resumeLink: true,
            resumeFileUrl: true,
            workSampleUrl: true,
            expectedPay: true,
            howHeard: true,
            followedSocials: true,
            stage: true,
            source: true,
            notes: true,
            rejectionEmailSentAt: true,
            interviewInviteSentAt: true,
            offerEmailSentAt: true,
            convertedEmployeeId: true,
            answers: { include: { roleQuestion: true } },
            generalAnswers: { include: { generalQuestion: true } },
          },
        },
      },
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!role) notFound();

  const origin = await getOrigin();
  const applyLink = `${origin}/${role.clientOrg.slug}/apply/${role.slug}`;
  const shortLink = role.shortCode ? `${origin}/go/${role.shortCode}` : null;
  const googleFormWebhookUrl = role.googleFormWebhookToken
    ? `${origin}/api/webhooks/google-form/${role.googleFormWebhookToken}`
    : null;
  const googleFormAppsScript = `// Fires automatically once you add the "On form submit" trigger below.
function onFormSubmit(e) {
  postAnswers(buildAnswers(e.response));
}

// One-time only: brings in responses this form already collected before you
// connected it here. Run this yourself from the function dropdown -- it never
// runs on its own. Run it once, ideally before adding the trigger above, so you
// don't end up with a duplicate for a response that already came in live.
function importExistingResponses() {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  responses.forEach(function (response) {
    postAnswers(buildAnswers(response));
  });
  Logger.log("Imported " + responses.length + " existing response(s).");
}

function buildAnswers(response) {
  var answers = {};
  response.getItemResponses().forEach(function (item) {
    var title = item.getItem().getTitle();
    var value = item.getResponse();

    // File upload questions return Drive file IDs; make each one viewable by
    // link and send its URL instead, so a photo question turns into a link.
    if (item.getItem().getType() === FormApp.ItemType.FILE_UPLOAD) {
      var ids = Array.isArray(value) ? value : [value];
      value = ids.map(function (id) {
        var file = DriveApp.getFileById(id);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000";
      });
    }

    answers[title] = value;
  });
  return answers;
}

function postAnswers(answers) {
  UrlFetchApp.fetch("${googleFormWebhookUrl ?? "PASTE_YOUR_WEBHOOK_URL_HERE"}", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ answers: answers }),
  });
}`;

  const updateRoleStageWithId = updateRoleStage.bind(null, role.id);
  const addCandidateWithId = addCandidate.bind(null, role.id);
  const toggleAcceptingWithId = toggleAcceptingApplications.bind(null, role.id);
  const updateTitleWithId = updateRoleTitle.bind(null, role.id);
  const regenerateSlugWithId = regenerateRoleSlug.bind(null, role.id);
  const getShortLinkWithId = getShortLink.bind(null, role.id);
  const updateCompanyWithId = updateRoleCompany.bind(null, role.id);
  const updateLocationWithId = updateRoleLocation.bind(null, role.id);
  const updateSchedulingLinkWithId = updateRoleSchedulingLink.bind(null, role.id);
  const updateCustomInterviewMessageWithId = updateRoleCustomInterviewMessage.bind(null, role.id);
  const updateCustomOfferMessageWithId = updateRoleCustomOfferMessage.bind(null, role.id);
  const updateDescriptionWithId = updateRoleDescription.bind(null, role.id);
  const updateDefaultFieldsWithId = updateRoleDefaultFields.bind(null, role.id);
  const updateModeWithId = updateRoleMode.bind(null, role.id);
  const updateWorkSampleLabelWithId = updateRoleWorkSampleLabel.bind(null, role.id);
  const enableGoogleFormIntakeWithId = enableGoogleFormIntake.bind(null, role.id);
  const disableGoogleFormIntakeWithId = disableGoogleFormIntake.bind(null, role.id);
  const updateGoogleFormPublicUrlWithId = updateRoleGoogleFormPublicUrl.bind(null, role.id);
  const addQuestionWithId = addQuestion.bind(null, role.id);
  const createSectionWithId = createQuestionSection.bind(null, role.id);
  const clearAllWithId = clearAllCandidates.bind(null, role.id);

  const ungroupedQuestions = role.questions.filter((q) => !q.sectionId);
  const questionsBySection = new Map(
    role.questionSections.map((s) => [s.id, role.questions.filter((q) => q.sectionId === s.id)]),
  );

  const googleFormCreatorScript = googleFormWebhookUrl
    ? buildGoogleFormCreatorScript({
        roleId: role.id,
        mode: role.mode,
        roleTitle: role.title,
        companyName: role.clientOrg.name,
        webhookUrl: googleFormWebhookUrl,
        workSampleLabel: role.workSampleLabel,
        askApplicantLocation: role.askApplicantLocation,
        askYearsExperience: role.askYearsExperience,
        askExpectedPay: role.askExpectedPay,
        askHowHeard: role.askHowHeard,
        askResumeLink: role.askResumeLink,
        ungroupedQuestions,
        sections: role.questionSections,
        questionsBySection,
      })
    : null;
  const googleFormCreateFnName = `createApplicationForm_${role.id.replace(/[^a-zA-Z0-9]/g, "")}`;

  const candidatesWithCvUrl = role.candidates.map((c) => ({
    ...c,
    cvUrl: c.resumeFileUrl ?? c.resumeLink,
  }));

  const columns = CANDIDATE_STAGE_ORDER.map((stage) => ({
    stage,
    candidates: candidatesWithCvUrl.filter((c) => c.stage === stage),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{role.title}</h1>
          <p className="text-sm text-slate">
            {role.clientOrg.name}
            {role.location && ` · ${role.location}`}
            {!role.acceptingApplications && (
              <span className="ml-2 rounded-btn bg-orange-light/40 px-2 py-0.5 text-xs font-medium text-orange">
                Applications closed
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton link={shortLink ?? applyLink} />
          <a
            href={`/ops/recruitment/${role.id}/export`}
            className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
          >
            Export CSV
          </a>
        </div>
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
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                  const sendRejectionWithIds = sendCandidateRejectionEmail.bind(null, candidate.id, role.id);
                  const sendInterviewInviteWithIds = sendCandidateInterviewInviteEmail.bind(null, candidate.id, role.id);
                  const sendOfferWithIds = sendCandidateOfferEmail.bind(null, candidate.id, role.id);
                  const convertToEmployeeWithIds = convertCandidateToEmployee.bind(null, candidate.id, role.id);
                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      roleTitle={role.title}
                      updateStage={updateStageWithIds}
                      deleteCandidate={deleteWithIds}
                      sendRejectionEmail={sendRejectionWithIds}
                      sendInterviewInviteEmail={sendInterviewInviteWithIds}
                      sendOfferEmail={sendOfferWithIds}
                      convertToEmployee={convertToEmployeeWithIds}
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

      <details className="rounded-card border border-border bg-paper">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          + Add a candidate manually
        </summary>
        <div className="border-t border-border p-6">
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
              <label className={labelClass} htmlFor="location">Location (optional)</label>
              <input id="location" name="location" placeholder="e.g. Lekki, Lagos" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" name="notes" rows={2} className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>Add candidate</button>
          </form>
        </div>
      </details>

      <details className="rounded-card border border-border bg-paper">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          Role settings: link, title, description & default fields
        </summary>
        <div className="space-y-4 border-t border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Public application link</p>
              <a
                href={applyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate underline hover:text-orange"
              >
                {applyLink}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <CopyLinkButton link={applyLink} />
              <ConfirmSubmitButton
                action={regenerateSlugWithId}
                confirmMessage="Update the link to match the current title? Anyone with the old link will get a page-not-found instead, so only do this before you've shared it."
                className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
              >
                Update link to match title
              </ConfirmSubmitButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-semibold text-ink">Short link for sharing</p>
              {shortLink ? (
                <a
                  href={shortLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate underline hover:text-orange"
                >
                  {shortLink}
                </a>
              ) : (
                <p className="text-xs text-slate">
                  Not generated yet. Use this for social media and DMs instead of the long link above.
                </p>
              )}
            </div>
            {shortLink ? (
              <CopyLinkButton link={shortLink} />
            ) : (
              <form action={getShortLinkWithId}>
                <button
                  type="submit"
                  className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink"
                >
                  Generate short link
                </button>
              </form>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-ink">Accepting applications</p>
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

          <form action={updateTitleWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="title">Role title</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="title" name="title" required defaultValue={role.title} className={`${inputClass} max-w-sm`} />
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save title
              </button>
            </div>
            <p className="text-xs text-slate-light">
              The public application link stays the same when you change this. Use &ldquo;Update link to match
              title&rdquo; above if you want the link to catch up.
            </p>
          </form>

          <form action={updateCompanyWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="clientOrgId">Company</label>
            <div className="flex flex-wrap items-center gap-2">
              <select id="clientOrgId" name="clientOrgId" defaultValue={role.clientOrgId} className={`${inputClass} max-w-sm`}>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save company
              </button>
            </div>
            <p className="text-xs text-slate-light">Changing this changes the public application link, since the company name is part of the URL.</p>
          </form>

          <form action={updateLocationWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="location">Location</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="location"
                name="location"
                defaultValue={role.location ?? ""}
                placeholder="e.g. Lekki Phase 1, Lagos, Nigeria"
                className={`${inputClass} max-w-sm`}
              />
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save location
              </button>
            </div>
            <p className="text-xs text-slate-light">Shown to applicants on the public job listing.</p>
          </form>

          <form action={updateDescriptionWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="description">What candidates see on the application page</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={role.description ?? ""}
              placeholder="A short description of the role, responsibilities, and what makes this a good fit."
              className={inputClass}
            />
            <p className="text-xs text-slate-light">
              Wrap text in ** to bold it, e.g. **Key Responsibilities** shows up bold to applicants.
            </p>
            <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
              Save description
            </button>
          </form>

          <form action={updateSchedulingLinkWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="schedulingLink">Interview scheduling link</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="schedulingLink"
                name="schedulingLink"
                type="url"
                defaultValue={role.schedulingLink ?? ""}
                placeholder="e.g. https://calendly.com/your-team/interview"
                className={`${inputClass} max-w-sm`}
              />
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save link
              </button>
            </div>
            <p className="text-xs text-slate-light">
              Included in interview invite emails. Leave blank to just ask candidates to reply with their availability.
            </p>
          </form>

          <form action={updateCustomInterviewMessageWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="customInterviewMessage">Custom interview invite message</label>
            <textarea
              id="customInterviewMessage"
              name="customInterviewMessage"
              rows={4}
              defaultValue={role.customInterviewMessage ?? ""}
              placeholder="e.g. Please record a 2-minute video introducing yourself and send us the link. Once we've watched it, we'll follow up on scheduling a call."
              className={inputClass}
            />
            <p className="text-xs text-slate-light">
              Replaces the standard invite wording for this role only. Leave blank to use the normal &ldquo;we&rsquo;d
              like to invite you to an interview&rdquo; message. The greeting and sign-off stay automatic either way.
            </p>
            <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
              Save message
            </button>
          </form>

          <form action={updateCustomOfferMessageWithId} className="space-y-1 border-t border-border pt-4">
            <label className={labelClass} htmlFor="customOfferMessage">Custom offer email message</label>
            <textarea
              id="customOfferMessage"
              name="customOfferMessage"
              rows={4}
              defaultValue={role.customOfferMessage ?? ""}
              placeholder="e.g. Specific next steps or details for this role's offer."
              className={inputClass}
            />
            <p className="text-xs text-slate-light">
              Replaces the standard offer wording for this role only. Leave blank to use the normal offer message.
            </p>
            <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
              Save message
            </button>
          </form>

          <form action={updateModeWithId} className="space-y-2 border-t border-border pt-4">
            <label className={labelClass} htmlFor="mode">Application type</label>
            <select id="mode" name="mode" defaultValue={role.mode} className={inputClass}>
              <option value="FORMAL">Formal (application form with custom questions)</option>
              <option value="INFORMAL">Informal (name, phone, photo of their work)</option>
            </select>
            <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
              Save type
            </button>
          </form>

          {role.mode === "INFORMAL" && (
            <form action={updateWorkSampleLabelWithId} className="space-y-1 border-t border-border pt-4">
              <label className={labelClass} htmlFor="workSampleLabel">What should they show a photo of?</label>
              <input
                id="workSampleLabel"
                name="workSampleLabel"
                defaultValue={role.workSampleLabel ?? ""}
                placeholder="e.g. Photo of the best outfit you've made"
                className={inputClass}
              />
              <p className="text-xs text-slate-light">
                Shown to applicants on the public form. Tailor it per role, e.g. best pair of shoes for a
                shoemaker, best hairstyle for a hairdresser.
              </p>
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save prompt
              </button>
            </form>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <p className={labelClass}>Google Form intake</p>
            <p className="text-xs text-slate-light">
              People are more familiar with Google Forms than a new site. Point a Google Form at this role and
              submissions land here alongside everyone else, so Ops still reviews everyone from one place.
            </p>

            <form action={updateGoogleFormPublicUrlWithId} className="space-y-1">
              <label className={labelClass} htmlFor="googleFormPublicUrl">
                Your Google Form link <span className="text-xs font-normal text-slate-light">(optional, to share on social media)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="googleFormPublicUrl"
                  name="googleFormPublicUrl"
                  defaultValue={role.googleFormPublicUrl ?? ""}
                  placeholder="https://forms.gle/..."
                  className={inputClass}
                />
                {role.googleFormPublicUrl && <CopyLinkButton link={role.googleFormPublicUrl} />}
              </div>
              <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                Save link
              </button>
            </form>

            {googleFormWebhookUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input readOnly value={googleFormWebhookUrl} className={`${inputClass} font-mono text-xs`} />
                  <CopyLinkButton link={googleFormWebhookUrl} />
                </div>
                <details className="rounded-card border border-border p-3" open>
                  <summary className="cursor-pointer text-xs font-medium text-slate hover:text-ink">
                    Don&rsquo;t have a form yet? Let this create it for you
                  </summary>
                  <p className="mt-2 text-xs text-slate-light">
                    Hiring for more than one role? Each one needs its own Google Form. You can either start a new
                    project for each (simplest), or paste every role&rsquo;s script into one shared project — the
                    function names below are unique to this role, so they won&rsquo;t clash with another role&rsquo;s
                    script in the same project.
                  </p>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs text-slate">
                    <li>Go to script.google.com → New project (or open the shared project you&rsquo;re already using).</li>
                    <li>Paste the script below at the end of the file (don&rsquo;t delete anything already there from another role), then save it (Ctrl/Cmd+S).</li>
                    <li>
                      In the toolbar, use the function dropdown next to &ldquo;Run&rdquo; to pick{" "}
                      <code>{googleFormCreateFnName}</code>, then click <strong>Run</strong>.
                    </li>
                    <li>
                      The first time, Google will ask you to authorize the script — click through it (this is your
                      own script, so it&rsquo;s safe).
                    </li>
                    <li>
                      Check your email for the new form&rsquo;s edit link and the share link to post on
                      Instagram/WhatsApp/etc. The submit trigger is already wired up.
                    </li>
                    {(role.mode === "INFORMAL" || role.askResumeLink) && (
                      <li>
                        Google won&rsquo;t let scripts create a &ldquo;File upload&rdquo; question, so open the
                        edit link from that email and add one yourself (+ button → File upload) — the email spells
                        out exactly what to title it. Once it&rsquo;s there, submissions to it flow in
                        automatically.
                      </li>
                    )}
                  </ol>
                  {role.mode === "INFORMAL" && (
                    <p className="mt-3 rounded-btn bg-orange-light/40 px-3 py-2 text-xs text-orange">
                      Heads up: Google Forms requires people to sign in with a Google account before they can
                      upload a photo. If your applicants are informal, low-literacy users applying from Instagram,
                      that&rsquo;s real friction — the built-in informal apply link (camera capture, no sign-in) may
                      work better for those roles than Google Forms.
                    </p>
                  )}
                  {googleFormCreatorScript && (
                    <div className="mt-3 flex items-start gap-2">
                      <pre className="max-h-64 flex-1 overflow-auto rounded-btn bg-paper-2 p-3 text-[11px] leading-relaxed text-ink">
                        {googleFormCreatorScript}
                      </pre>
                      <CopyLinkButton link={googleFormCreatorScript} />
                    </div>
                  )}
                </details>
                <details className="rounded-card border border-border p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate hover:text-ink">
                    Already have a Google Form (maybe with old responses on it)? Connect it instead
                  </summary>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs text-slate">
                    <li>Open your Google Form, then Extensions → Apps Script.</li>
                    <li>Delete anything in the editor and paste the script below, then save it.</li>
                    <li>
                      Already has responses sitting in it from before? Use the function dropdown next to
                      &ldquo;Run&rdquo; to pick <code>importExistingResponses</code> and click <strong>Run</strong>{" "}
                      first — this brings in everything already submitted, once, as a one-time backfill. Skip this
                      step if the form has no responses yet.
                    </li>
                    <li>
                      Click the clock icon (Triggers) → Add Trigger → choose <code>onFormSubmit</code>, event source
                      &ldquo;From form&rdquo;, event type &ldquo;On form submit&rdquo; → Save. This is what keeps
                      new responses flowing in from here on.
                    </li>
                    <li>Submit a test response on the form to confirm it shows up in the pipeline below.</li>
                  </ol>
                  <p className="mt-3 text-xs text-slate-light">
                    Photo &amp; file upload questions work too — the script makes each uploaded file viewable by
                    link and it shows up here like any other candidate photo. Do the backfill step before adding
                    the trigger, not after, or a response that already flowed in live will get imported a second
                    time as a duplicate.
                  </p>
                  <div className="mt-3 flex items-start gap-2">
                    <pre className="max-h-64 flex-1 overflow-auto rounded-btn bg-paper-2 p-3 text-[11px] leading-relaxed text-ink">
                      {googleFormAppsScript}
                    </pre>
                    <CopyLinkButton link={googleFormAppsScript} />
                  </div>
                </details>
                <div className="flex gap-2">
                  <ConfirmSubmitButton
                    action={disableGoogleFormIntakeWithId}
                    confirmMessage="Turn off Google Form intake for this role? The current link will stop working."
                    className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink"
                  >
                    Turn off
                  </ConfirmSubmitButton>
                  <form action={enableGoogleFormIntakeWithId}>
                    <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                      Regenerate link
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={enableGoogleFormIntakeWithId}>
                <button type="submit" className={buttonClass}>Turn on Google Form intake</button>
              </form>
            )}
          </div>

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

          <form action={updateRoleStageWithId} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
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
      </details>

      {role.mode === "INFORMAL" ? (
        <div className="rounded-card border border-border bg-paper p-5">
          <p className="text-sm font-semibold text-ink">Application questions</p>
          <p className="mt-1 text-sm text-slate">
            Informal roles use a fixed, simple form (name, phone, email, location, and a photo of their work) and
            don&rsquo;t support custom questions, that&rsquo;s deliberate, to keep it easy for applicants who may not
            read or write much. Switch this role&rsquo;s type back to Formal above if you need custom questions.
          </p>
        </div>
      ) : (
      <details className="rounded-card border border-border bg-paper">
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          Application questions {role.questions.length > 0 && `(${role.questions.length})`}
        </summary>
        <div className="border-t border-border p-6">
          <p className="mb-4 text-sm text-slate">
            Shown to every applicant on the public form, in this order. Group related questions into a section (e.g.
            &ldquo;Availability&rdquo;, &ldquo;Sewing experience&rdquo;) to keep a long form easy to follow, or leave a
            question ungrouped and it will show under &ldquo;Additional questions&rdquo;.
          </p>
          <SuggestQuestionsPanel roleId={role.id} />

          {ungroupedQuestions.length > 0 && (
            <div className="mb-4 space-y-2">
              {ungroupedQuestions.map((q, i) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  index={i}
                  siblingCount={ungroupedQuestions.length}
                  roleId={role.id}
                  sections={role.questionSections}
                />
              ))}
            </div>
          )}
          {role.questions.length === 0 && role.questionSections.length === 0 && (
            <p className="mb-4 text-sm text-slate-light">No custom questions yet. Applicants will just submit name, email, and a CV link.</p>
          )}

          {role.questionSections.length > 0 && (
            <div className="mb-4 space-y-3">
              {role.questionSections.map((section, si) => {
                const sectionQuestions = questionsBySection.get(section.id) ?? [];
                const renameWithIds = renameQuestionSection.bind(null, section.id, role.id);
                const deleteSectionWithIds = deleteQuestionSection.bind(null, section.id, role.id);
                const moveSectionWithIds = moveQuestionSection.bind(null, section.id, role.id);
                return (
                  <div key={section.id} className="rounded-btn border border-border bg-paper-2 p-3">
                    <details>
                      <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-sm font-semibold text-ink">{section.title}</p>
                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                          <form action={moveSectionWithIds}>
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              disabled={si === 0}
                              aria-label="Move section up"
                              className="text-xs font-medium text-slate hover:text-ink disabled:opacity-30"
                            >
                              ↑
                            </button>
                          </form>
                          <form action={moveSectionWithIds}>
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              disabled={si === role.questionSections.length - 1}
                              aria-label="Move section down"
                              className="text-xs font-medium text-slate hover:text-ink disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </form>
                          <span className="text-xs font-medium text-indigo">Rename</span>
                          <form action={deleteSectionWithIds}>
                            <button type="submit" className="text-xs font-medium text-slate hover:text-orange">
                              Delete section
                            </button>
                          </form>
                        </div>
                      </summary>
                      <form action={renameWithIds} className="mt-3 flex items-end gap-3 border-t border-border pt-3">
                        <div className="flex-1">
                          <label className={labelClass} htmlFor={`section-title-${section.id}`}>Section title</label>
                          <input
                            id={`section-title-${section.id}`}
                            name="title"
                            required
                            defaultValue={section.title}
                            className={inputClass}
                          />
                        </div>
                        <button type="submit" className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink">
                          Save
                        </button>
                      </form>
                    </details>

                    <div className="mt-3 space-y-2">
                      {sectionQuestions.map((q, i) => (
                        <QuestionRow
                          key={q.id}
                          q={q}
                          index={i}
                          siblingCount={sectionQuestions.length}
                          roleId={role.id}
                          sections={role.questionSections}
                        />
                      ))}
                      {sectionQuestions.length === 0 && (
                        <p className="text-xs text-slate-light">No questions in this section yet.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form action={createSectionWithId} className="mb-6 flex items-end gap-3 border-t border-border pt-4">
            <div className="flex-1 max-w-xs">
              <label className={labelClass} htmlFor="sectionTitle">New section</label>
              <input id="sectionTitle" name="title" placeholder="e.g. Availability" className={inputClass} />
            </div>
            <button type="submit" className="rounded-btn border border-border px-3 py-2 text-xs font-medium text-slate hover:text-ink">
              Add section
            </button>
          </form>

          <form action={addQuestionWithId} className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-light">Add a question</p>
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
              {role.questionSections.length > 0 && (
                <SectionSelect id="sectionId" sections={role.questionSections} defaultValue="" />
              )}
              <label className="flex items-center gap-2 pb-2 text-sm text-slate">
                <input type="checkbox" name="required" defaultChecked className="rounded border-border" />
                Required
              </label>
            </div>
            <div>
              <label className={labelClass} htmlFor="options">
                Choices (for multiple choice or checkboxes only, one per line)
              </label>
              <textarea id="options" name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>Add question</button>
          </form>
        </div>
      </details>
      )}
    </div>
  );
}
