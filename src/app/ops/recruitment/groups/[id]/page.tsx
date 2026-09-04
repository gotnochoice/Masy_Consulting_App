import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getOrigin } from "@/lib/url";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  updateApplicationGroupTitle,
  updateApplicationGroupRoles,
  addGeneralQuestion,
  updateGeneralQuestion,
  deleteGeneralQuestion,
  deleteApplicationGroup,
} from "../actions";

const QUESTION_TYPE_OPTIONS = [
  { value: "SHORT_TEXT", label: "Short answer" },
  { value: "LONG_TEXT", label: "Long answer" },
  { value: "LINK", label: "Link" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice (pick one)" },
  { value: "CHECKBOXES", label: "Checkboxes (pick multiple)" },
];

export default async function ApplicationGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MASY_OPS");
  const { id } = await params;

  const group = await db.applicationGroup.findUnique({
    where: { id },
    include: {
      clientOrg: true,
      questions: { orderBy: { order: "asc" } },
      roles: { orderBy: { title: "asc" } },
    },
  });
  if (!group) notFound();

  const eligibleRoles = await db.openRole.findMany({
    where: {
      clientOrgId: group.clientOrgId,
      mode: "FORMAL",
      OR: [{ applicationGroupId: null }, { applicationGroupId: group.id }],
    },
    orderBy: { title: "asc" },
  });

  const origin = await getOrigin();
  const applyLink = `${origin}/${group.clientOrg.slug}/jobs/${group.slug}`;
  const memberRoleIds = new Set(group.roles.map((r) => r.id));

  const updateTitleWithId = updateApplicationGroupTitle.bind(null, group.id);
  const updateRolesWithId = updateApplicationGroupRoles.bind(null, group.id);
  const addQuestionWithId = addGeneralQuestion.bind(null, group.id);
  const deleteGroupWithId = deleteApplicationGroup.bind(null, group.id);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
          <h1 className="text-2xl font-bold tracking-tight text-ink">{group.title}</h1>
          <p className="text-sm text-slate">{group.clientOrg.name}</p>
        </div>
        <ConfirmSubmitButton
          action={deleteGroupWithId}
          confirmMessage={`Delete "${group.title}"? Its roles go back to having their own separate apply links. This can't be undone.`}
          className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-orange"
        >
          Delete group
        </ConfirmSubmitButton>
      </div>

      <div className="space-y-3 rounded-card border border-border bg-paper p-6">
        <p className="text-sm font-semibold text-ink">Shareable link</p>
        {group.roles.length === 0 ? (
          <p className="text-xs text-orange">
            Add at least one role below before sharing this link -- right now it has nothing to show applicants.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input readOnly value={applyLink} className={`${inputClass} font-mono text-xs`} />
            <CopyLinkButton link={applyLink} />
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-card border border-border bg-paper p-6">
        <p className="text-sm font-semibold text-ink">Title</p>
        <form action={updateTitleWithId} className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelClass} htmlFor="title">Group title</label>
            <input id="title" name="title" defaultValue={group.title} required className={inputClass} />
          </div>
          <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
            Save
          </button>
        </form>
      </div>

      <div className="space-y-3 rounded-card border border-border bg-paper p-6">
        <p className="text-sm font-semibold text-ink">Roles in this group</p>
        <p className="text-xs text-slate-light">
          Applicants pick from these on the shared link. Only formal roles at {group.clientOrg.name} that
          aren&rsquo;t already in a different group show up here.
        </p>
        {eligibleRoles.length === 0 ? (
          <p className="text-xs text-slate-light">No formal roles available for {group.clientOrg.name} yet.</p>
        ) : (
          <form action={updateRolesWithId} className="space-y-3">
            <div className="space-y-2">
              {eligibleRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="roleIds"
                    value={role.id}
                    defaultChecked={memberRoleIds.has(role.id)}
                    className="rounded border-border"
                  />
                  {role.title}
                  {!role.acceptingApplications && (
                    <span className="text-xs text-slate-light">(applications closed)</span>
                  )}
                </label>
              ))}
            </div>
            <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
              Save roles
            </button>
          </form>
        )}
      </div>

      <div className="space-y-4 rounded-card border border-border bg-paper p-6">
        <div>
          <p className="text-sm font-semibold text-ink">Shared questions</p>
          <p className="text-xs text-slate-light">
            Asked to every applicant no matter which role they pick, before that role&rsquo;s own questions.
          </p>
        </div>

        {group.questions.length > 0 && (
          <div className="space-y-2">
            {group.questions.map((q) => {
              const deleteWithIds = deleteGeneralQuestion.bind(null, q.id, group.id);
              const updateWithIds = updateGeneralQuestion.bind(null, q.id, group.id);
              return (
                <details key={q.id} className="rounded-btn border border-border px-3 py-2">
                  <summary className="flex cursor-pointer list-none flex-col gap-2 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{q.label}</p>
                      <p className="text-xs text-slate-light">
                        {QUESTION_TYPE_OPTIONS.find((o) => o.value === q.type)?.label} · {q.required ? "required" : "optional"}
                        {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOXES") && q.options.length > 0 && ` · ${q.options.join(", ")}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs font-medium text-indigo">Edit</span>
                      <ConfirmSubmitButton
                        action={deleteWithIds}
                        confirmMessage={`Remove "${q.label}"? This can't be undone.`}
                        className="text-xs font-medium text-slate-light hover:text-orange"
                      >
                        Remove
                      </ConfirmSubmitButton>
                    </div>
                  </summary>

                  <form action={updateWithIds} className="mt-3 space-y-3 border-t border-border pt-3">
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
                    <button type="submit" className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-slate hover:text-ink">
                      Save changes
                    </button>
                  </form>
                </details>
              );
            })}
          </div>
        )}

        <form action={addQuestionWithId} className="space-y-3 border-t border-border pt-4">
          <p className={labelClass}>Add a shared question</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className={labelClass} htmlFor="label">Question</label>
              <input id="label" name="label" placeholder="e.g. What's your availability?" required className={inputClass} />
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
              Choices (for multiple choice or checkboxes only, one per line)
            </label>
            <textarea id="options" name="options" rows={3} placeholder={"Option A\nOption B\nOption C"} className={inputClass} />
          </div>
          <button type="submit" className={buttonClass}>Add question</button>
        </form>
      </div>
    </div>
  );
}
