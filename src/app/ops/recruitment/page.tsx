import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { RoleStageBadge } from "@/components/stage-badge";
import { inputClass, labelClass, buttonClass } from "@/lib/form-styles";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createRole, deleteRole, cloneRole } from "./actions";

export default async function OpsRecruitmentPage() {
  await requireRole("MASY_OPS");

  const [roles, orgs, websiteCounts] = await Promise.all([
    db.openRole.findMany({
      include: { clientOrg: true, _count: { select: { candidates: true } } },
      orderBy: [{ clientOrg: { name: "asc" } }, { createdAt: "desc" }],
    }),
    db.clientOrg.findMany({ orderBy: { name: "asc" } }),
    db.candidate.groupBy({ by: ["openRoleId"], where: { source: "WEBSITE" }, _count: { _all: true } }),
  ]);
  const websiteCountByRole = new Map(websiteCounts.map((c) => [c.openRoleId, c._count._all]));

  return (
    <div className="space-y-8">
      <div>
        <span className="mb-2 block h-1 w-9 rounded-full bg-orange" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Recruitment</h1>
        <p className="text-sm text-slate">Open roles and candidate pipelines across every client organization.</p>
      </div>

      {roles.length === 0 && (
        <div className="rounded-card border border-border bg-paper px-4 py-8 text-center text-sm text-slate-light">
          No open roles yet.
        </div>
      )}

      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {roles.map((role) => {
          const deleteRoleWithId = deleteRole.bind(null, role.id);
          const cloneRoleWithId = cloneRole.bind(null, role.id);
          return (
            <div key={role.id} className="rounded-card border border-border bg-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{role.title}</p>
                  <p className="text-xs text-slate">
                    {role.clientOrg.name}
                    {role.location && ` · ${role.location}`}
                  </p>
                </div>
                <RoleStageBadge stage={role.stage} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
                <span>{role._count.candidates} candidate{role._count.candidates === 1 ? "" : "s"}</span>
                {role.acceptingApplications ? (
                  <span>{websiteCountByRole.get(role.id) ?? 0} online</span>
                ) : (
                  <span className="text-slate-light">Applications closed</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
                <Link href={`/ops/recruitment/${role.id}`} className="text-sm font-medium text-indigo hover:text-indigo-light">
                  View pipeline
                </Link>
                <form action={cloneRoleWithId}>
                  <button type="submit" className="text-sm font-medium text-slate hover:text-ink">
                    Clone
                  </button>
                </form>
                <ConfirmSubmitButton
                  action={deleteRoleWithId}
                  confirmMessage={
                    role._count.candidates > 0
                      ? `Delete "${role.title}"? This will also delete all ${role._count.candidates} candidate(s) in its pipeline. This can't be undone, so export a CSV first if you want to keep a record.`
                      : `Delete "${role.title}"? This can't be undone.`
                  }
                  className="text-sm font-medium text-slate hover:text-orange"
                >
                  Delete
                </ConfirmSubmitButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      {roles.length > 0 && (
        <div className="hidden overflow-x-auto rounded-card border border-border bg-paper sm:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-paper-2">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Organization</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Stage</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Candidates</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-light">Applications</th>
                <th className="px-4 py-2.5" />
                <th className="px-4 py-2.5" />
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => {
                const deleteRoleWithId = deleteRole.bind(null, role.id);
                const cloneRoleWithId = cloneRole.bind(null, role.id);
                return (
                  <tr key={role.id} className="hover:bg-paper-2">
                    <td className="px-4 py-3 font-medium text-ink">{role.title}</td>
                    <td className="px-4 py-3 text-slate">
                      {role.clientOrg.name}
                      {role.location && <span className="block text-xs text-slate-light">{role.location}</span>}
                    </td>
                    <td className="px-4 py-3"><RoleStageBadge stage={role.stage} /></td>
                    <td className="px-4 py-3 text-slate">{role._count.candidates}</td>
                    <td className="px-4 py-3 text-slate">
                      {role.acceptingApplications ? (
                        <span>{websiteCountByRole.get(role.id) ?? 0} online</span>
                      ) : (
                        <span className="text-slate-light">Closed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/ops/recruitment/${role.id}`} className="text-sm font-medium text-indigo hover:text-indigo-light">
                        View pipeline
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={cloneRoleWithId}>
                        <button type="submit" className="text-sm font-medium text-slate hover:text-ink">
                          Clone
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmSubmitButton
                        action={deleteRoleWithId}
                        confirmMessage={
                          role._count.candidates > 0
                            ? `Delete "${role.title}"? This will also delete all ${role._count.candidates} candidate(s) in its pipeline. This can't be undone, so export a CSV first if you want to keep a record.`
                            : `Delete "${role.title}"? This can't be undone.`
                        }
                        className="text-sm font-medium text-slate hover:text-orange"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="max-w-xl rounded-card border border-border bg-paper p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">Open a role</h2>
        <form action={createRole} className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className={labelClass} htmlFor="title">Role title</label>
            <input id="title" name="title" required className={inputClass} />
          </div>
          <div className="flex-1">
            <label className={labelClass} htmlFor="clientOrgId">Organization</label>
            <select id="clientOrgId" name="clientOrgId" required defaultValue="" className={inputClass}>
              <option value="" disabled>Select organization</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className={buttonClass}>Open role</button>
        </form>
      </div>
    </div>
  );
}
